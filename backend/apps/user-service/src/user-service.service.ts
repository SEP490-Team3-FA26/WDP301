import { Injectable, Logger, Inject, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { User } from '../../auth-service/src/auth/user.schema';
import { Cart } from './schemas/cart.schema';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import { randomUUID } from 'crypto';

import { ExportJob } from './interfaces/export-job.interface';
import { ExportJobStatusDto } from './dto/export-job-status.dto';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcryptjs';
import { subscribeToKafkaTopics } from '../../api-gateway/src/common/kafka.helper';

@Injectable()
export class UserService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(UserService.name);

  // Audit Log high performance batching properties
  private logBuffer: any[] = [];
  private readonly bufferSizeLimit = 50;
  private readonly bufferBytesLimit = 5 * 1024 * 1024; // 5MB
  private currentBufferBytes = 0;
  private flushInterval: NodeJS.Timeout = null;

  // Background export jobs map
  private exportJobs = new Map<string, ExportJob>();

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @Inject('INVENTORY_SERVICE')
    private readonly inventoryClient: ClientKafka,
  ) { }

  async onModuleInit() {
    this.inventoryClient.subscribeToResponseOf('inventory.medicine.get_by_id');
    this.inventoryClient.subscribeToResponseOf('inventory.medicine.get_by_ids');

    // Start periodic bulk flush timer (every 150ms)
    this.flushInterval = setInterval(() => {
      this.flushLogs().catch((err) => this.logger.error('Error in periodic flushLogs', err));
    }, 150);

    const retries = 20;
    const delay = 3000;
    for (let i = 0; i < retries; i++) {
      try {
        await this.inventoryClient.connect();
        this.logger.log('Successfully connected ClientKafka for INVENTORY_SERVICE');
        break; // break instead of return so initialization continues if needed
      } catch (err: any) {
        if (i === retries - 1) {
          this.logger.error('Failed to connect to INVENTORY_SERVICE via Kafka after retries', err);
          throw err;
        }
        this.logger.warn(`Kafka INVENTORY_SERVICE connection attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        try { await this.inventoryClient.close(); } catch (e) { }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    await subscribeToKafkaTopics(
      this.inventoryClient,
      ['inventory.medicine.get_by_id', 'inventory.medicine.get_by_ids'],
      20,
      3000,
    );
    this.logger.log('Successfully connected ClientKafka for INVENTORY_SERVICE');
  }

  async onApplicationShutdown() {
    this.logger.log('UserService shutting down. Flushing remaining audit logs...');
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushLogs();
  }


  async editProfile(userId: string, data: { fullName?: string }) {
    this.logger.log(`Editing profile for user ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    if (data.fullName) {
      user.fullName = data.fullName;
    }

    await user.save();

    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }

  async changeAvatar(userId: string, avatarUrl: string) {
    this.logger.log(`Changing avatar for user ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    user.avatarUrl = avatarUrl;
    await user.save();

    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }

  // --- CART OPERATIONS ---

  async getCart(userId: string) {
    this.logger.log(`Fetching cart for user ${userId}`);
    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [] });
      await cart.save();
    }

    if (cart.items.length === 0) {
      return { items: [], totalQuantity: 0 };
    }

    const itemIds = cart.items.map((it) => it.medicineId);
    let medicineDetails: any[] = [];

    try {
      medicineDetails = await lastValueFrom(
        this.inventoryClient.send('inventory.medicine.get_by_ids', { ids: itemIds })
      );
    } catch (err: any) {
      this.logger.error(`Failed to fetch medicine details via Kafka RPC: ${err.message}`);
    }

    const medicineMap = new Map<string, any>(
      medicineDetails.map((med) => [med.id.toString(), med])
    );

    let hasHealed = false;
    const enrichedItems = [];

    for (const item of cart.items) {
      const med = medicineMap.get(item.medicineId);
      if (!med) {
        // Auto-healing: Medicine has been deleted from the catalog, so remove it from user's cart
        hasHealed = true;
        continue;
      }

      const currentStock = med.stock || 0;
      let finalQty = item.quantity;

      // Cap quantity if it exceeds current stock
      if (finalQty > currentStock) {
        finalQty = currentStock;
        hasHealed = true;
      }

      let currentPrice = med.price;
      if (med.priceTiers && med.priceTiers.length > 0) {
        const applicableTiers = [...med.priceTiers].sort((a: any, b: any) => b.minQuantity - a.minQuantity);
        for (const tier of applicableTiers) {
          if (finalQty >= tier.minQuantity) {
            currentPrice = tier.price;
            break;
          }
        }
      }

      const priceChanged = currentPrice !== item.addedPrice;

      enrichedItems.push({
        id: item.medicineId,
        name: med.name,
        active_ingredient: med.active_ingredient || '',
        category: med.category || 'Chưa phân loại',
        unit: med.unit || 'Viên',
        price: currentPrice,
        addedPrice: item.addedPrice,
        priceChanged,
        stock: currentStock,
        quantity: finalQty,
      });

      // Update quantity or pricing in the DB item if adjusted/healed
      item.quantity = finalQty;
    }

    // Filter out items with 0 quantity (out of stock/depleted items capped to 0) or deleted items
    const validItems = cart.items.filter((it, index) => {
      const med = medicineMap.get(it.medicineId);
      return med && it.quantity > 0;
    });

    if (hasHealed) {
      cart.items = validItems as any;
      await cart.save();
    }

    const finalEnrichedItems = enrichedItems.filter((it) => it.stock > 0 && it.quantity > 0);
    const totalQuantity = finalEnrichedItems.reduce((sum, it) => sum + it.quantity, 0);

    return {
      items: finalEnrichedItems,
      totalQuantity,
    };
  }

  async addToCart(userId: string, medicineId: string, quantity: number) {
    let medicine: any;

    try {
      this.logger.log(`[addToCart] Sending Kafka request to inventory for medicineId: ${medicineId} (userId: ${userId})`);
      medicine = await lastValueFrom(
        this.inventoryClient.send('inventory.medicine.get_by_id', { id: medicineId })
      );
      this.logger.log(`[addToCart] Received medicine from inventory: ${JSON.stringify(medicine)}`);
    } catch (err: any) {
      this.logger.error(`[addToCart] Error calling inventory.medicine.get_by_id for ID ${medicineId}: ${err.message}`, err.stack);
      return { error: true, message: `Không tìm thấy thông tin thuốc trên hệ thống (Lỗi: ${err.message})`, statusCode: 404 };
    }

    if (!medicine) {
      return { error: true, message: 'Thuốc không tồn tại', statusCode: 404 };
    }

    const currentStock = medicine.stock || 0;
    if (currentStock <= 0) {
      return { error: true, message: 'Thuốc hiện tại đã hết hàng. Vui lòng chọn sản phẩm khác.', statusCode: 400 };
    }

    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [] });
    }

    const existingIndex = cart.items.findIndex((it) => it.medicineId === medicineId);
    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (newQty > currentStock) {
        return { error: true, message: `Chỉ còn ${currentStock} sản phẩm khả dụng trong kho!`, statusCode: 400 };
      }
      cart.items[existingIndex].quantity = newQty;

      // Update addedPrice to reflect new tiered price if applicable
      let currentPrice = medicine.price;
      if (medicine.priceTiers && medicine.priceTiers.length > 0) {
        const applicableTiers = [...medicine.priceTiers].sort((a: any, b: any) => b.minQuantity - a.minQuantity);
        for (const tier of applicableTiers) {
          if (newQty >= tier.minQuantity) {
            currentPrice = tier.price;
            break;
          }
        }
      }
      cart.items[existingIndex].addedPrice = currentPrice;

    } else {
      if (quantity > currentStock) {
        return { error: true, message: `Chỉ còn ${currentStock} sản phẩm khả dụng trong kho!`, statusCode: 400 };
      }

      let initialPrice = medicine.price;
      if (medicine.priceTiers && medicine.priceTiers.length > 0) {
        const applicableTiers = [...medicine.priceTiers].sort((a: any, b: any) => b.minQuantity - a.minQuantity);
        for (const tier of applicableTiers) {
          if (quantity >= tier.minQuantity) {
            initialPrice = tier.price;
            break;
          }
        }
      }

      cart.items.push({
        medicineId,
        quantity,
        addedPrice: initialPrice,
      } as any);
    }

    await cart.save();
    return { success: true, message: 'Thêm vào giỏ hàng thành công!' };
  }

  async updateCartItem(userId: string, medicineId: string, quantity: number) {
    this.logger.log(`Updating quantity for medicine ${medicineId} in cart for user ${userId} to ${quantity}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      return { error: true, message: 'Giỏ hàng không tồn tại', statusCode: 404 };
    }

    const existingIndex = cart.items.findIndex((it) => it.medicineId === medicineId);
    if (existingIndex === -1) {
      return { error: true, message: 'Thuốc không có trong giỏ hàng', statusCode: 404 };
    }

    if (quantity <= 0) {
      cart.items.splice(existingIndex, 1);
      await cart.save();
      return { success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
    }

    let medicine: any;
    try {
      medicine = await lastValueFrom(
        this.inventoryClient.send('inventory.medicine.get_by_id', { id: medicineId })
      );
    } catch (err: any) {
      return { error: true, message: 'Không thể kết nối đến kho dữ liệu', statusCode: 500 };
    }

    const currentStock = medicine ? medicine.stock : 0;
    if (quantity > currentStock) {
      return { error: true, message: `Chỉ còn ${currentStock} sản phẩm khả dụng trong kho!`, statusCode: 400 };
    }

    cart.items[existingIndex].quantity = quantity;

    // Update addedPrice to reflect new tiered price if applicable
    if (medicine) {
      let currentPrice = medicine.price;
      if (medicine.priceTiers && medicine.priceTiers.length > 0) {
        const applicableTiers = [...medicine.priceTiers].sort((a: any, b: any) => b.minQuantity - a.minQuantity);
        for (const tier of applicableTiers) {
          if (quantity >= tier.minQuantity) {
            currentPrice = tier.price;
            break;
          }
        }
      }
      cart.items[existingIndex].addedPrice = currentPrice;
    }

    await cart.save();
    return { success: true, message: 'Cập nhật số lượng thành công!' };
  }

  async deleteCartItem(userId: string, medicineId: string) {
    this.logger.log(`Deleting medicine ${medicineId} from cart for user ${userId}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      return { error: true, message: 'Giỏ hàng không tồn tại', statusCode: 404 };
    }

    cart.items = cart.items.filter((it) => it.medicineId !== medicineId) as any;
    await cart.save();
    return { success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
  }

  async clearCart(userId: string) {
    this.logger.log(`Clearing cart for user ${userId}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    return { success: true, message: 'Làm trống giỏ hàng thành công!' };
  }

  getMemberTier(accumulatedPoints: number): { name: string; multiplier: number } {
    if (accumulatedPoints >= 10000) return { name: 'Diamond', multiplier: 2.0 };
    if (accumulatedPoints >= 5000) return { name: 'Gold', multiplier: 1.5 };
    if (accumulatedPoints >= 1000) return { name: 'Silver', multiplier: 1.2 };
    return { name: 'Bronze', multiplier: 1.0 };
  }

  async getLoyaltyInfo(userId: string) {
    this.logger.log(`Getting loyalty info for user ${userId}`);
    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }
    const accPoints = user.accumulatedPoints || 0;
    const currentPoints = user.points || 0;
    const tierInfo = this.getMemberTier(accPoints);

    return {
      userId: user._id.toString(),
      fullName: user.fullName,
      phone: user.phone || '',
      email: user.email,
      points: currentPoints,
      accumulatedPoints: accPoints,
      tier: tierInfo.name,
      multiplier: tierInfo.multiplier,
      conversionRate: 1, // 1 point = 1 VND
    };
  }

  async lookupLoyaltyByPhone(phone: string) {
    this.logger.log(`Looking up loyalty for phone ${phone}`);
    const user = await this.userModel.findOne({ phone }).exec();
    if (!user) {
      return { error: true, message: 'Khách hàng chưa đăng ký thành viên', statusCode: 404 };
    }
    const accPoints = user.accumulatedPoints || 0;
    const currentPoints = user.points || 0;
    const tierInfo = this.getMemberTier(accPoints);

    return {
      userId: user._id.toString(),
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      points: currentPoints,
      accumulatedPoints: accPoints,
      tier: tierInfo.name,
      multiplier: tierInfo.multiplier,
      conversionRate: 1,
    };
  }

  async updatePoints(data: { phone?: string; userId?: string; pointsDelta: number; accumulatedDelta?: number }) {
    this.logger.log(`Updating points: phone=${data.phone}, userId=${data.userId}, delta=${data.pointsDelta}`);
    let user;
    if (data.userId) {
      user = await this.userModel.findById(data.userId);
    } else if (data.phone) {
      user = await this.userModel.findOne({ phone: data.phone });
    }

    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    user.points = Math.max(0, (user.points || 0) + data.pointsDelta);
    if (data.accumulatedDelta && data.accumulatedDelta > 0) {
      user.accumulatedPoints = (user.accumulatedPoints || 0) + data.accumulatedDelta;
    }

    await user.save();
    const tierInfo = this.getMemberTier(user.accumulatedPoints);
    return {
      success: true,
      points: user.points,
      accumulatedPoints: user.accumulatedPoints,
      tier: tierInfo.name,
      multiplier: tierInfo.multiplier,
    };
  }

  // --- AUDIT LOG OPERATIONS ---

  async createAuditLog(data: any) {
    // Calculate approximate size of document in bytes for the 5MB memory limit
    const jsonStr = JSON.stringify(data);
    const sizeBytes = Buffer.byteLength(jsonStr);

    this.logBuffer.push(data);
    this.currentBufferBytes += sizeBytes;

    // Flush immediately if either constraint is met: 50 logs OR 5MB of buffer size
    if (this.logBuffer.length >= this.bufferSizeLimit || this.currentBufferBytes >= this.bufferBytesLimit) {
      this.logger.log(`Audit log buffer limits hit (Size: ${this.logBuffer.length}, Bytes: ${this.currentBufferBytes}). Flushing now.`);
      this.flushLogs().catch((err) => this.logger.error('Error during immediate flushLogs', err));
    }

    return { success: true };
  }

  async flushLogs() {
    if (this.logBuffer.length === 0) {
      return;
    }

    // Shallow copy buffer and reset state
    const logsToWrite = [...this.logBuffer];
    this.logBuffer = [];
    this.currentBufferBytes = 0;

    try {
      // Map logs to bulkWrite insertOne operations
      const bulkOps = logsToWrite.map((log) => ({
        insertOne: {
          document: log,
        },
      }));

      const startTime = Date.now();
      // ordered: false skips duplicates (Unique Index constraints) and writes other unique items
      const result = await this.auditLogModel.bulkWrite(bulkOps, { ordered: false });
      const duration = Date.now() - startTime;

      this.logger.log(`Successfully bulk-wrote ${result.insertedCount} audit logs (Duration: ${duration}ms).`);
    } catch (err: any) {
      // Catch and ignore expected Duplicate Key warnings since they represent idempotency blocks
      this.logger.warn(`Bulk write completed with skipped items (e.g. duplicate key blocks). Details: ${err.message}`);
    }

    // Broadcast the batch of successfully saved logs to audit.persisted Kafka topic
    try {
      this.inventoryClient.emit('audit.persisted', logsToWrite);
    } catch (emitErr: any) {
      this.logger.error('Failed to emit audit.persisted events to Kafka', emitErr);
    }
  }

  async listAuditLogs(query: { page?: number; limit?: number; search?: string; role?: string; module?: string; eventType?: string; severity?: string; status?: string; afterEventId?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Exact filters
    if (query.role) filter.role = query.role;
    if (query.eventType) filter.eventType = query.eventType;
    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;

    // Support module scope filtering (array or single string)
    if (query.module) {
      if (query.module.includes(',')) {
        filter.module = { $in: query.module.split(',') };
      } else {
        filter.module = query.module;
      }
    }

    // High performance text index search (removes slow regex matching)
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    // Support cursor-based catch up query after a specific log event
    if (query.afterEventId) {
      const referenceLog = await this.auditLogModel.findOne({ auditEventId: query.afterEventId }).exec();
      if (referenceLog) {
        filter._id = { $gt: referenceLog._id };
      }
    }

    try {
      const total = await this.auditLogModel.countDocuments(filter).exec();
      const items = await this.auditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      return { items, total, page, limit };
    } catch (err: any) {
      this.logger.error('Failed to list audit logs', err);
      return { error: true, message: err.message };
    }
  }

  async exportAuditLogs(query: any) {
    const jobId = randomUUID();

    // Initialize background export job
    this.exportJobs.set(jobId, {
      id: jobId,
      status: 'PENDING',
      createdAt: new Date(),
    });

    // Run export in background (non-blocking)
    this.runExportJob(jobId, query).catch((err) => {
      this.logger.error(`Export Job ${jobId} failed`, err);
    });

    return { jobId, status: 'PENDING' };
  }

  async getExportJobStatus(jobId: string): Promise<ExportJobStatusDto> {
    const job = this.exportJobs.get(jobId);
    if (!job) {
      throw new RpcException({ message: 'Export job not found', statusCode: 404 });
    }
    return job;
  }

  private async runExportJob(jobId: string, query: any) {
    const job = this.exportJobs.get(jobId);
    if (!job) return;

    job.status = 'PROCESSING';
    this.logger.log(`Starting export job ${jobId}`);

    const filter: any = {};
    if (query.role) filter.role = query.role;
    if (query.eventType) filter.eventType = query.eventType;
    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;
    if (query.module) {
      if (query.module.includes(',')) {
        filter.module = { $in: query.module.split(',') };
      } else {
        filter.module = query.module;
      }
    }
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    // Exclude large payload and before/after fields from exports for optimal file sizing
    const cursor = this.auditLogModel.find(filter)
      .select('-payload -diff')
      .sort({ createdAt: -1 })
      .cursor();

    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filename = `audit-export-${jobId}.csv.gz`;
    const filePath = path.join(tempDir, filename);

    const writeStream = fs.createWriteStream(filePath);
    const gzip = zlib.createGzip();

    gzip.pipe(writeStream);

    // CSV Headers
    const headers = [
      'Time (UTC)',
      'Correlation ID',
      'Request ID',
      'Session ID',
      'User Email',
      'Role',
      'Module',
      'Action Code',
      'Action Name',
      'Event Type',
      'Entity Type',
      'Entity ID',
      'Entity Name',
      'Version',
      'Status',
      'Severity',
      'IP Address',
      'Browser',
      'OS',
      'Device',
      'Summary'
    ].join(',') + '\n';

    gzip.write(headers);

    let count = 0;
    try {
      for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        const row = [
          doc.createdAt ? doc.createdAt.toISOString() : '',
          doc.correlationId || '',
          doc.requestId || '',
          doc.sessionId || '',
          doc.username || '',
          doc.role || '',
          doc.module || '',
          doc.actionCode || '',
          doc.actionName || '',
          doc.eventType || '',
          doc.entityType || '',
          doc.entityId || '',
          doc.entityName || '',
          doc.entityVersion != null ? String(doc.entityVersion) : '',
          doc.status || '',
          doc.severity || '',
          doc.ip || '',
          doc.browser || '',
          doc.os || '',
          doc.device || '',
          doc.summary || ''
        ];

        // Format CSV Row with RFC 4180 escaping
        const escapedRow = row.map((val) => {
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '--') + '"'; // sanitize quotes
          }
          return str;
        }).join(',') + '\n';

        gzip.write(escapedRow);
        count++;
      }

      gzip.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      job.status = 'COMPLETED';
      job.filename = filename;
      job.totalRecords = count;
      this.logger.log(`Export job ${jobId} finished successfully. Wrote ${count} records.`);
    } catch (err: any) {
      this.logger.error(`Error processing export job ${jobId}`, err);
      job.status = 'FAILED';
      job.error = err.message;
      try {
        gzip.end();
        writeStream.end();
      } catch (e) { }
    }
  }

  // --- ADMIN EMPLOYEE MANAGEMENT ---

  async createEmployee(data: any) {
    this.logger.log(`Admin creating new employee: ${data.email}`);
    const existing = await this.userModel.findOne({ email: data.email }).exec();
    if (existing) {
      return { error: true, message: 'Email đã tồn tại', statusCode: 409 };
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const newUser = new this.userModel({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      role: data.role,
      branchId: data.branchId || null,
      isActive: true,
      isEmailVerified: true, // Auto verify for employee
    });

    await newUser.save();
    const result = newUser.toObject();
    delete result.passwordHash;
    return result;
  }

  async listEmployees(query: any) {
    this.logger.log('Admin listing employees');
    // Mặc định bỏ qua role 'user' (khách hàng)
    const filter: any = { role: { $ne: 'user' } };
    if (query?.role) {
      filter.role = query.role;
    }
    if (query?.branchId) {
      filter.branchId = query.branchId;
    }

    const employees = await this.userModel.find(filter).select('-passwordHash').sort({ createdAt: -1 }).exec();
    return employees;
  }

  async getEmployeeById(id: string) {
    this.logger.log(`Admin fetching employee: ${id}`);
    const employee = await this.userModel.findById(id).select('-passwordHash').exec();
    if (!employee) {
      return { error: true, message: 'Nhân viên không tồn tại', statusCode: 404 };
    }
    return employee;
  }

  async updateEmployee(id: string, data: any) {
    this.logger.log(`Admin updating employee: ${id}`);
    const employee = await this.userModel.findById(id).exec();
    if (!employee) {
      return { error: true, message: 'Nhân viên không tồn tại', statusCode: 404 };
    }

    if (data.fullName) employee.fullName = data.fullName;
    if (data.role) employee.role = data.role;
    if (data.branchId !== undefined) employee.branchId = data.branchId;

    await employee.save();
    const result = employee.toObject();
    delete result.passwordHash;
    return result;
  }

  async toggleBanEmployee(id: string) {
    this.logger.log(`Admin toggling ban for employee: ${id}`);
    const employee = await this.userModel.findById(id).exec();
    if (!employee) {
      return { error: true, message: 'Nhân viên không tồn tại', statusCode: 404 };
    }

    // Toggle trạng thái isActive
    employee.isActive = !employee.isActive;
    await employee.save();

    const result = employee.toObject();
    delete result.passwordHash;
    return result;
  }
}

