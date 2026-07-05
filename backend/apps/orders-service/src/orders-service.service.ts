import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { PayOS } from '@payos/node';
import { Order } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { Voucher } from './schemas/voucher.schema';
import { subscribeToKafkaTopics } from '../../api-gateway/src/common/kafka.helper';

const DEFAULT_PHONE_NUMBER = '0900000000';

@Injectable()
export class OrdersServiceService implements OnModuleInit {
  private readonly logger = new Logger(OrdersServiceService.name);
  private payos: PayOS;

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Voucher.name) private readonly voucherModel: Model<Voucher>,
    private readonly configService: ConfigService,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientKafka,
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.configService.get<string>('PAYOS_API_KEY');
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');

    this.logger.log(`Initializing PayOS client with client ID: ${clientId ? 'FOUND' : 'MISSING'}`);
    this.payos = new PayOS({ clientId, apiKey, checksumKey });
  }

  async onModuleInit() {
    this.inventoryClient.subscribeToResponseOf('inventory.sale.create');
    this.inventoryClient.subscribeToResponseOf('inventory.sale.revert');
    this.userClient.subscribeToResponseOf('user.loyalty.get');
    this.userClient.subscribeToResponseOf('user.loyalty.lookup');
    this.userClient.subscribeToResponseOf('user.loyalty.update_points');
    this.authClient.subscribeToResponseOf('auth.get.user.by.id');
    await this.inventoryClient.connect();
    await this.userClient.connect();
    await this.authClient.connect();

    // Background job to cancel PENDING orders older than 15 minutes
    setInterval(() => {
      this.cancelExpiredOrdersInBackground().catch(err => {
        this.logger.error('Failed to run cancel expired orders job:', err);
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async cancelExpiredOrdersInBackground() {
    this.logger.log('Running background job to cancel expired PENDING orders...');
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const expiredOrders = await this.orderModel.find({
      paymentStatus: 'PENDING',
      createdAt: { $lt: fifteenMinutesAgo },
      paymentMethod: 'QR_PAY'
    }).exec();

    for (const order of expiredOrders) {
      try {
        if (order.payosPaymentLinkId) {
          await this.payos.paymentRequests.cancel(order.orderCode, 'Hết hạn thanh toán (Quá 15 phút)');
        }
        order.paymentStatus = 'CANCELLED';
        await order.save();

        // Refund points if they were redeemed
        if (order.redeemedPoints > 0 && order.patientPhone !== '0900000000') {
          await lastValueFrom(
            this.userClient.send('user.loyalty.update_points', {
              phone: order.patientPhone,
              pointsDelta: order.redeemedPoints,
            })
          );
        }
        this.logger.log(`Cancelled expired order: ${order.orderCode}`);
      } catch (err: any) {
        this.logger.error(`Error cancelling expired order ${order.orderCode}: ${err.message}`);
        // If PayOS already cancelled or not found, just mark as cancelled in DB
        if (err.message?.includes('not found') || err.message?.includes('already')) {
          order.paymentStatus = 'CANCELLED';
          await order.save();
        }
      }
    }
  }


  async createOrder(data: CreateOrderDto) {
    this.logger.log(`Creating order in DB. PaymentMethod: ${data.paymentMethod}`);

    // Generate a unique 64-bit int order code for PayOS
    const orderCode = Math.floor(100000 + Math.random() * 90000000);

    let voucherCode = undefined;
    let voucherDiscount = 0;

    if (data.voucherCode) {
      const subtotal = data.items.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0);
      const valRes = await this.validateVoucher(data.voucherCode, subtotal);
      if (valRes.error) {
        throw new RpcException(valRes.message);
      }
      voucherCode = valRes.code;
      voucherDiscount = valRes.discount;
    }

    let redeemedPoints = data.redeemedPoints || 0;
    let pointsDiscount = 0;
    let earnedPoints = 0;
    let patientEmail = data.patientEmail || undefined;

    // Nếu đơn hàng từ UserLoyalty, lấy thông tin email
    if (data.userId) {
      try {
        const userLoyalty = await lastValueFrom(
          this.userClient.send('user.loyalty.get', { userId: data.userId })
        );
        if (userLoyalty) {
          // Gắn email để gửi hóa đơn
          if (userLoyalty.email && !patientEmail) {
            patientEmail = userLoyalty.email;
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch user loyalty for ID ${data.userId}: ${err.message}`);
      }

      // Fallback: Lấy email từ auth-service (bảng users) nếu chưa có patientEmail
      if (!patientEmail) {
        try {
          const authUser = await lastValueFrom(
            this.authClient.send('auth.get.user.by.id', data.userId)
          );
          if (authUser && authUser.email) {
            patientEmail = authUser.email;
          }
        } catch (err) {
          this.logger.warn(`Failed to fetch user email from auth-service for ID ${data.userId}: ${err.message}`);
        }
      }
    }

    if (data.patientPhone && data.patientPhone !== DEFAULT_PHONE_NUMBER) {
      try {
        const userLoyalty = await lastValueFrom(
          this.userClient.send('user.loyalty.lookup', { phone: data.patientPhone })
        );
        if (userLoyalty && !userLoyalty.error) {
          const userPoints = userLoyalty.points || 0;
          if (redeemedPoints > userPoints) {
            throw new RpcException(`Số điểm quy đổi (${redeemedPoints}) lớn hơn số điểm bạn đang có (${userPoints})`);
          }

          if (userLoyalty.email && !patientEmail) {
            patientEmail = userLoyalty.email;
          }

          // Enforce 50% max point redemption constraint
          const subtotal = data.items.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0);
          const memberDiscount = Math.round(subtotal * 0.05);
          const payableBeforePoints = subtotal - memberDiscount - voucherDiscount;
          const maxRedeemPoints = Math.floor(payableBeforePoints * 0.5);

          if (redeemedPoints > maxRedeemPoints) {
            throw new RpcException(`Chỉ được phép tiêu điểm tối đa 50% giá trị đơn hàng (tối đa quy đổi ${maxRedeemPoints} điểm)`);
          }

          pointsDiscount = redeemedPoints * (userLoyalty.conversionRate || 1);

          // Earned points: 1% * tier multiplier
          earnedPoints = Math.round((data.totalAmount / 100) * (userLoyalty.multiplier || 1.0));
        } else {
          if (redeemedPoints > 0) {
            throw new RpcException('Số điện thoại chưa đăng ký thành viên thân thiết');
          }
          earnedPoints = Math.round(data.totalAmount / 100);
        }
      } catch (err: any) {
        this.logger.error(`Error looking up customer: ${err.message}`);
        if (redeemedPoints > 0) {
          throw new RpcException(err.message || 'Không thể xác thực điểm tích lũy của khách hàng.');
        }
        earnedPoints = Math.round(data.totalAmount / 100);
      }
    } else {
      if (redeemedPoints > 0) {
        throw new RpcException('Vui lòng cung cấp số điện thoại để tiêu điểm tích lũy.');
      }
    }

    // Instantly deduct points from user balance if redeeming
    if (redeemedPoints > 0) {
      await lastValueFrom(
        this.userClient.send('user.loyalty.update_points', {
          phone: data.patientPhone,
          pointsDelta: -redeemedPoints,
        })
      );
    }

    const newOrder = new this.orderModel({
      orderCode,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      patientEmail,
      shippingAddress: data.shippingAddress || 'Mua tại quầy',
      items: data.items,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod || 'QR_PAY',
      paymentStatus: 'PENDING',
      type: data.type || 'ONLINE',
      voucherCode,
      voucherDiscount,
      redeemedPoints,
      pointsDiscount,
      earnedPoints,
    });

    // ========================================================
    // ENTERPRISE SAGA PATTERN IMPLEMENTATION
    // ========================================================

    // Step 1: Claim Voucher atomically
    if (newOrder.voucherCode) {
      const voucherDoc = await this.voucherModel.findOne({ code: newOrder.voucherCode }).exec();
      const usageLimitFilter = (voucherDoc?.usageLimit !== null && voucherDoc?.usageLimit !== undefined)
        ? { usedCount: { $lt: voucherDoc.usageLimit } }
        : {};

      const claimed = await this.voucherModel.findOneAndUpdate(
        { code: newOrder.voucherCode, isActive: true, ...usageLimitFilter },
        { $inc: { usedCount: 1 } },
        { new: true }
      ).exec();

      if (!claimed) {
        throw new RpcException({ message: 'Mã giảm giá đã hết lượt sử dụng hoặc không còn hiệu lực' });
      }
    }

    let saleRes;
    try {
      // Step 2: Deduct Loyalty Points (Reserve)
      if (redeemedPoints > 0) {
        await lastValueFrom(
          this.userClient.send('user.loyalty.update_points', {
            phone: newOrder.patientPhone,
            pointsDelta: -redeemedPoints,
          })
        );
      }

      // Step 3: Reserve Inventory
      saleRes = await this.deductInventory(newOrder);

      // Branching logic based on payment method
      if (data.paymentMethod === 'QR_PAY') {
        // Step 4A: Generate PayOS Link
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

        // Clean description to avoid PayOS validation error (alphanumeric, no spaces, max 25 chars)
        const description = `WDP${orderCode}`.substring(0, 25);

        const paymentBody = {
          orderCode,
          amount: data.totalAmount,
          description,
          items: data.items.map((it: any) => ({
            name: it.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 20),
            quantity: it.quantity,
            price: it.price,
          })),
          returnUrl: `${frontendUrl}/customer/checkout?success=true&orderCode=${orderCode}`,
          cancelUrl: `${frontendUrl}/customer/checkout?cancel=true&orderCode=${orderCode}`,
        };

        this.logger.log(`Calling PayOS with orderCode: ${orderCode}`);
        const paymentLinkRes = await this.payos.paymentRequests.create(paymentBody);

        newOrder.payosPaymentLinkId = paymentLinkRes.paymentLinkId;
        await newOrder.save();

        return {
          success: true,
          orderCode,
          paymentMethod: 'QR_PAY',
          checkoutUrl: paymentLinkRes.checkoutUrl,
          qrCode: paymentLinkRes.qrCode,
          order: newOrder,
        };
      } catch (err) {
        this.logger.error('Error creating PayOS payment link:', err);
        throw new RpcException({ message: `Lỗi tạo link thanh toán PayOS: ${err.message}` });
      }
    } else {
      // CASH or CARD: Complete order instantly
      newOrder.paymentStatus = 'PAID';
      await newOrder.save();

      // Increment voucher usage on successful payment
      if (newOrder.voucherCode) {
        await this.voucherModel.updateOne(
          { code: newOrder.voucherCode },
          { $inc: { usedCount: 1 } }
        ).exec();
      }

      // Deduct inventory and record sale
      try {
        const saleRes = await this.deductInventory(newOrder);

        // CREDIT POINTS ON SUCCESSFUL CASH/CARD PAYMENT
        if (newOrder.earnedPoints > 0 && newOrder.patientPhone !== '0900000000') {
          await lastValueFrom(
            this.userClient.send('user.loyalty.update_points', {
              phone: newOrder.patientPhone,
              pointsDelta: newOrder.earnedPoints,
              accumulatedDelta: newOrder.earnedPoints,
            })
          );
        }

        newOrder.paymentStatus = 'PAID';
        await newOrder.save();
        this.sendInvoiceEmailAsync(newOrder);

        return {
          success: true,
          orderCode,
          paymentMethod: data.paymentMethod,
          order: newOrder,
          saleResult: saleRes,
        };
      } catch (err) {
        this.logger.error('Error deducting inventory:', err);

        // Asynchronously trigger sending invoice email even if inventory deduction fails
        this.sendInvoiceEmailAsync(newOrder);

        // Save with warning
        return {
          success: true,
          orderCode,
          paymentMethod: data.paymentMethod,
          order: newOrder,
          warning: `Đơn hàng đã lưu nhưng trừ kho thất bại: ${err.message}`,
        };
      }
    }
  }

  async checkPaymentStatus(orderCode: number) {
    this.logger.log(`Checking payment status for orderCode: ${orderCode}`);
    const order = await this.orderModel.findOne({ orderCode }).exec();
    if (!order) {
      throw new RpcException({ message: `Không tìm thấy đơn hàng với mã: ${orderCode}` });
    }

    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'CANCELLED') {
      return { success: true, status: order.paymentStatus, order };
    }

    try {
      this.logger.log(`Querying PayOS for details of order: ${orderCode}`);
      const paymentInfo = await this.payos.paymentRequests.get(orderCode);

      this.logger.log(`PayOS status for ${orderCode}: ${paymentInfo.status}`);
      if (paymentInfo.status === 'PAID') {
        order.paymentStatus = 'PAID';
        await order.save();

        // Increment voucher usage on successful payment
        if (order.voucherCode) {
          await this.voucherModel.updateOne(
            { code: order.voucherCode },
            { $inc: { usedCount: 1 } }
          ).exec();
        }

        // Deduct inventory
        const saleRes = await this.deductInventory(order);

        // CREDIT POINTS ON SUCCESSFUL PAYOS PAYMENT
        if (order.earnedPoints > 0 && order.patientPhone !== '0900000000') {
          await lastValueFrom(
            this.userClient.send('user.loyalty.update_points', {
              phone: order.patientPhone,
              pointsDelta: order.earnedPoints,
              accumulatedDelta: order.earnedPoints,
            })
          );
        }

        this.sendInvoiceEmailAsync(order);

        return { success: true, status: 'PAID', order, saleResult: saleRes };
      } else if (paymentInfo.status === 'CANCELLED') {
        order.paymentStatus = 'CANCELLED';
        await order.save();

        // SAGA REVERT FOR CANCELLED QR_PAY

        // 1. Revert Inventory
        await lastValueFrom(this.inventoryClient.send('inventory.sale.revert', { orderCode: order.orderCode })).catch(e => this.logger.error('Failed to revert inventory on cancel', e));

        // 2. Refund Points
        if (order.redeemedPoints > 0 && order.patientPhone !== DEFAULT_PHONE_NUMBER) {
          await lastValueFrom(
            this.userClient.send('user.loyalty.update_points', {
              phone: order.patientPhone,
              pointsDelta: order.redeemedPoints,
            })
          ).catch(e => this.logger.error('Failed to refund points on cancel', e));
        }

        // 3. Revert Voucher
        if (order.voucherCode) {
          await this.voucherModel.updateOne(
            { code: order.voucherCode },
            { $inc: { usedCount: -1 } }
          ).exec();
        }

        return { success: true, status: 'CANCELLED', order };
      }

      return { success: true, status: 'PENDING', order };
    } catch (err) {
      this.logger.error(`Error querying PayOS for ${orderCode}:`, err);
      return { success: true, status: 'PENDING', order };
    }
  }

  private sendInvoiceEmailAsync(order: any) {
    if (order.patientEmail) {
      this.logger.log(`Emitting orders.invoice.send event to auth-service for orderCode: ${order.orderCode} to email: ${order.patientEmail}`);
      this.authClient.emit('orders.invoice.send', {
        orderCode: order.orderCode,
        patientName: order.patientName,
        patientPhone: order.patientPhone,
        patientEmail: order.patientEmail,
        shippingAddress: order.shippingAddress,
        items: order.items,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        type: order.type,
        voucherCode: order.voucherCode,
        voucherDiscount: order.voucherDiscount,
        redeemedPoints: order.redeemedPoints,
        pointsDiscount: order.pointsDiscount,
        earnedPoints: order.earnedPoints,
        createdAt: order.createdAt || new Date(),
      });
    } else {
      this.logger.warn(`No patientEmail configured for orderCode: ${order.orderCode} — skipping invoice email`);
    }
  }

  async listOrders() {
    return this.orderModel.find().sort({ createdAt: -1 }).exec();
  }

  private async deductInventory(order: any) {
    this.logger.log(`Sending stock deduction to inventory-service for orderCode: ${order.orderCode}`);
    const payload = {
      orderCode: order.orderCode,
      type: order.type === 'ONLINE' ? 'RETAIL' : order.type,
      paymentMethod: order.paymentMethod,
      items: order.items.map((it: any) => ({
        medicineId: it.medicineId,
        quantity: it.quantity,
      })),
      patientName: order.patientName,
      patientPhone: order.patientPhone,
      soldBy: order.type === 'ONLINE' ? 'Khách đặt online' : 'Dược sĩ tại quầy',
    };

    return new Promise((resolve, reject) => {
      this.inventoryClient.send('inventory.sale.create', payload).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err),
      });
    });
  }

  // ============================
  // VOUCHER MANAGEMENT LOGIC
  // ============================

  async createVoucher(data: any) {
    const code = data.code.toUpperCase().trim();

    // Check start and expiry date validity
    const start = new Date(data.startDate);
    const expiry = new Date(data.expiryDate);
    if (isNaN(start.getTime()) || isNaN(expiry.getTime())) {
      return { error: true, message: 'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ', statusCode: 400 };
    }
    if (expiry <= start) {
      return { error: true, message: 'Ngày kết thúc phải lớn hơn ngày bắt đầu', statusCode: 400 };
    }

    // Check numerical fields validity
    if (data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit <= 0) {
      return { error: true, message: 'Tổng lượt dùng phải lớn hơn hoặc bằng 1', statusCode: 400 };
    }
    if (data.discountValue <= 0) {
      return { error: true, message: 'Giá trị giảm phải lớn hơn 0', statusCode: 400 };
    }
    if (data.discountType === 'PERCENTAGE' && (data.discountValue <= 0 || data.discountValue > 100)) {
      return { error: true, message: 'Phần trăm giảm giá phải từ 1 đến 100', statusCode: 400 };
    }
    if (data.minOrderValue < 0) {
      return { error: true, message: 'Giá trị đơn hàng tối thiểu không được âm', statusCode: 400 };
    }
    if (data.maxDiscountValue !== undefined && data.maxDiscountValue !== null && data.maxDiscountValue <= 0) {
      return { error: true, message: 'Giá trị giảm tối đa phải lớn hơn 0', statusCode: 400 };
    }

    const existing = await this.voucherModel.findOne({ code }).exec();
    if (existing) {
      return { error: true, message: 'Mã voucher đã tồn tại', statusCode: 400 };
    }

    const newVoucher = new this.voucherModel({
      ...data,
      code,
      usedCount: 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
    await newVoucher.save();
    return newVoucher;
  }

  async updateVoucher(id: string, payload: any) {
    if (payload.code) {
      payload.code = payload.code.toUpperCase().trim();
    }

    // Check start and expiry date validity
    if (payload.startDate || payload.expiryDate) {
      const voucher = await this.voucherModel.findById(id).exec();
      if (voucher) {
        const finalStart = payload.startDate ? new Date(payload.startDate) : new Date(voucher.startDate);
        const finalExpiry = payload.expiryDate ? new Date(payload.expiryDate) : new Date(voucher.expiryDate);
        if (isNaN(finalStart.getTime()) || isNaN(finalExpiry.getTime())) {
          return { error: true, message: 'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ', statusCode: 400 };
        }
        if (finalExpiry <= finalStart) {
          return { error: true, message: 'Ngày kết thúc phải lớn hơn ngày bắt đầu', statusCode: 400 };
        }
      }
    }

    // Check numerical fields validity
    if (payload.usageLimit !== undefined && payload.usageLimit !== null && payload.usageLimit <= 0) {
      return { error: true, message: 'Tổng lượt dùng phải lớn hơn hoặc bằng 1', statusCode: 400 };
    }
    if (payload.discountValue !== undefined && payload.discountValue <= 0) {
      return { error: true, message: 'Giá trị giảm phải lớn hơn 0', statusCode: 400 };
    }
    if (payload.minOrderValue !== undefined && payload.minOrderValue < 0) {
      return { error: true, message: 'Giá trị đơn hàng tối thiểu không được âm', statusCode: 400 };
    }
    if (payload.maxDiscountValue !== undefined && payload.maxDiscountValue !== null && payload.maxDiscountValue <= 0) {
      return { error: true, message: 'Giá trị giảm tối đa phải lớn hơn 0', statusCode: 400 };
    }

    // Validate final percentage constraint
    if (payload.discountType !== undefined || payload.discountValue !== undefined) {
      const voucher = await this.voucherModel.findById(id).exec();
      if (voucher) {
        const finalType = payload.discountType !== undefined ? payload.discountType : voucher.discountType;
        const finalValue = payload.discountValue !== undefined ? payload.discountValue : voucher.discountValue;
        if (finalType === 'PERCENTAGE' && (finalValue <= 0 || finalValue > 100)) {
          return { error: true, message: 'Phần trăm giảm giá phải từ 1 đến 100', statusCode: 400 };
        }
      }
    }

    const updated = await this.voucherModel.findByIdAndUpdate(id, payload, { new: true }).exec();
    if (!updated) {
      return { error: true, message: 'Không tìm thấy voucher để cập nhật', statusCode: 404 };
    }
    return updated;
  }

  async deleteVoucher(id: string) {
    const updated = await this.voucherModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
    if (!updated) {
      return { error: true, message: 'Không tìm thấy voucher để vô hiệu hóa', statusCode: 404 };
    }
    return { success: true, message: 'Vô hiệu hóa voucher thành công' };
  }

  async listVouchers() {
    return this.voucherModel.find().sort({ createdAt: -1 }).exec();
  }

  async validateVoucher(code: string, subtotal: number) {
    if (!code) {
      return { error: true, message: 'Chưa nhập mã giảm giá', statusCode: 400 };
    }
    const voucher = await this.voucherModel.findOne({ code: code.toUpperCase().trim() }).exec();
    if (!voucher) {
      return { error: true, message: 'Mã giảm giá không tồn tại', statusCode: 404 };
    }
    if (!voucher.isActive) {
      return { error: true, message: 'Mã giảm giá đã bị vô hiệu hóa', statusCode: 400 };
    }

    const now = new Date();
    if (now < new Date(voucher.startDate)) {
      return { error: true, message: 'Chương trình khuyến mãi chưa bắt đầu', statusCode: 400 };
    }
    if (now > new Date(voucher.expiryDate)) {
      return { error: true, message: 'Mã giảm giá đã hết hạn sử dụng', statusCode: 400 };
    }

    if (voucher.usageLimit !== null && voucher.usageLimit !== undefined && voucher.usedCount >= voucher.usageLimit) {
      return { error: true, message: 'Mã giảm giá đã hết lượt sử dụng', statusCode: 400 };
    }

    if (subtotal < voucher.minOrderValue) {
      return {
        error: true,
        message: `Mã giảm giá chỉ áp dụng cho đơn hàng từ ${voucher.minOrderValue.toLocaleString('vi-VN')}₫ trở lên`,
        statusCode: 400
      };
    }

    let discount = 0;
    if (voucher.discountType === 'PERCENTAGE') {
      discount = Math.round(subtotal * (voucher.discountValue / 100));
      if (voucher.maxDiscountValue && discount > voucher.maxDiscountValue) {
        discount = voucher.maxDiscountValue;
      }
    } else if (voucher.discountType === 'FIXED_AMOUNT') {
      discount = voucher.discountValue;
      if (discount > subtotal) {
        discount = subtotal;
      }
    }

    return {
      success: true,
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discount,
    };
  }
}
