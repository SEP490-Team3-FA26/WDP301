import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseRequisition } from './schemas/purchase-requisition.schema';
import { PurchaseOrder } from './schemas/purchase-order.schema';
import { GoodsReceiptNote } from './schemas/goods-receipt-note.schema';
import { InventoryTransaction } from './schemas/inventory-transaction.schema';
import { StockTransfer } from './schemas/stock-transfer.schema';
import { Medicine } from '../medicine/schemas/medicine.schema';
import { MedicineBatch } from '../medicine/schemas/medicine-batch.schema';
import { firstValueFrom } from 'rxjs';
import { subscribeToKafkaTopics, sendKafkaMessage } from '../../../api-gateway/src/common/kafka.helper';
import { QuotaService } from '../quota/quota.service';
import { InspectionRecord } from './schemas/inspection-record.schema';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    @Inject('SUPPLIER_SERVICE') private readonly supplierClient: ClientKafka,
    @InjectModel(PurchaseRequisition.name) private readonly prModel: Model<PurchaseRequisition>,
    @InjectModel(PurchaseOrder.name) private readonly poModel: Model<PurchaseOrder>,
    @InjectModel(GoodsReceiptNote.name) private readonly grnModel: Model<GoodsReceiptNote>,
    @InjectModel(InventoryTransaction.name) private readonly txnModel: Model<InventoryTransaction>,
    @InjectModel(StockTransfer.name) private readonly transferModel: Model<StockTransfer>,
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
    @InjectModel(InspectionRecord.name) private readonly inspectionModel: Model<InspectionRecord>,
    private readonly quotaService: QuotaService,
  ) { }

  async onModuleInit() {
    await subscribeToKafkaTopics(
      this.supplierClient,
      [
        'supplier.get_by_id',
        'supplier.credit.check_limit',
        'supplier.credit.record_grn',
      ],
      20,
      3000,
    );
  }

  // ===========================================================================================
  // BƯỚC 1: PR - PURCHASE REQUISITION (Yêu cầu mua hàng từ chi nhánh)
  // ===========================================================================================

  /**
   * Tạo mới Yêu cầu mua hàng (PR) từ chi nhánh.
   * Chi nhánh không có quyền mua trực tiếp, chỉ gửi PR lên HQ.
   */
  async createPurchaseRequisition(data: any) {
    this.logger.log(`Creating Purchase Requisition from branch: ${data.branchName || data.branchId}`);

    // Validate: đảm bảo có items
    if (!data.items || data.items.length === 0) {
      throw new RpcException({ message: 'Phiếu yêu cầu mua hàng phải có ít nhất 1 sản phẩm' });
    }

    // Enrichment: lấy tên thuốc + đơn vị để denormalize và tính tổng chi phí ước tính
    const enrichedItems = [];
    let totalEstimatedCost = 0;

    for (const item of data.items) {
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      if (!medicine) {
        throw new RpcException({ message: `Không tìm thấy thuốc có ID: ${item.medicineId}` });
      }
      
      const qty = item.requestedQuantity || item.quantity;
      totalEstimatedCost += qty * (medicine.price || 0);

      enrichedItems.push({
        medicineId: item.medicineId,
        medicineName: medicine.name,
        requestedQuantity: qty,
        unit: medicine.unit || 'Hộp',
      });
    }

    // Kiểm tra ngân sách (Quota check)
    const today = new Date();
    const currentCycle = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const branchId = data.branchId || 'BRANCH_HQ';
    
    if (branchId !== 'BRANCH_HQ') {
      const quotas = await this.quotaService.findAll({ branchId, cycle: currentCycle });
      if (!quotas || quotas.length === 0) {
        throw new RpcException({ message: `Chi nhánh chưa được phân bổ hạn mức nhập hàng cho chu kỳ ${currentCycle}. Vui lòng liên hệ Quản trị viên.` });
      }

      const quota = quotas[0];
      if (quota.status !== 'Active') {
        throw new RpcException({ message: `Hạn mức nhập hàng của chi nhánh trong chu kỳ ${currentCycle} đang bị tạm khóa.` });
      }

      const remainingBudget = quota.totalBudget - (quota.usedAmount || 0);
      if (totalEstimatedCost > remainingBudget) {
        throw new RpcException({ 
          message: `Vượt quá hạn mức ngân sách! Tổng giá trị yêu cầu là ${totalEstimatedCost.toLocaleString()}đ, nhưng ngân sách còn lại chỉ là ${remainingBudget.toLocaleString()}đ.` 
        });
      }

      // Cập nhật số tiền đã sử dụng
      await this.quotaService.update((quota as any)._id.toString(), { usedAmount: (quota.usedAmount || 0) + totalEstimatedCost });
    }

    // Generate PR code: PR-YYYYMMDD-XXXX
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prModel.countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    });
    const prCode = `PR-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const isUrgent = !!data.isUrgent;
    const status = isUrgent ? 'URGENT_PENDING' : 'SUBMITTED';

    const pr = new this.prModel({
      prCode,
      branchId: data.branchId || 'BRANCH_HQ',
      branchName: data.branchName || 'Chi nhánh chính',
      items: enrichedItems,
      reason: data.reason || '',
      notes: data.notes || '',
      status: status,
      isUrgent: isUrgent,
      createdBy: data.createdBy || '',
    });

    await pr.save();

    const msg = isUrgent
      ? `Tạo YÊU CẦU HỎA TỐC ${prCode} thành công. Đã gửi thẳng lên Headquarters.`
      : `Tạo yêu cầu mua hàng ${prCode} thành công. Đang chờ Quản lý kho gom đơn.`;

    return {
      success: true,
      message: msg,
      data: pr,
    };
  }

  /**
   * Danh sách tất cả PR (cho Warehouse Manager xem để gom đơn, hoặc HQ xem để duyệt).
   */
  async listPurchaseRequisitions(query: any = {}) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.branchId) filter.branchId = query.branchId;
    return this.prModel.find(filter).sort({ isUrgent: -1, createdAt: -1 }).exec();
  }

  /**
   * Chi tiết một PR.
   */
  async getPurchaseRequisitionById(id: string) {
    const pr = await this.prModel.findById(id).exec();
    if (!pr) throw new RpcException({ message: `Không tìm thấy phiếu yêu cầu PR: ${id}` });
    return pr;
  }

  /**
   * Cập nhật trạng thái PR (ví dụ: OUT_OF_STOCK, REJECTED)
   */
  async updatePurchaseRequisitionStatus(id: string, status: string) {
    const pr = await this.prModel.findById(id).exec();
    if (!pr) throw new RpcException({ message: `Không tìm thấy phiếu yêu cầu PR: ${id}` });
    
    // Nếu chuyển sang trạng thái REJECTED hoặc CANCELLED, hoàn lại ngân sách hạn mức
    if ((status === 'REJECTED' || status === 'CANCELLED') && pr.status !== 'REJECTED' && pr.status !== 'CANCELLED') {
      if (pr.branchId !== 'BRANCH_HQ') {
        const prDate = new Date((pr as any).createdAt || new Date());
        const cycle = `${prDate.getFullYear()}-${String(prDate.getMonth() + 1).padStart(2, '0')}`;
        const quotas = await this.quotaService.findAll({ branchId: pr.branchId, cycle });
        
        if (quotas && quotas.length > 0) {
          const quota = quotas[0];
          
          // Tính lại tổng giá trị PR để hoàn lại
          let totalEstimatedCost = 0;
          for (const item of pr.items) {
            const medicine = await this.medicineModel.findById(item.medicineId).exec();
            if (medicine) {
              totalEstimatedCost += item.requestedQuantity * (medicine.price || 0);
            }
          }
          
          // Hoàn lại ngân sách
          const newUsedAmount = Math.max(0, (quota.usedAmount || 0) - totalEstimatedCost);
          await this.quotaService.update((quota as any)._id.toString(), { usedAmount: newUsedAmount });
        }
      }
    }

    pr.status = status;
    await pr.save();
    return pr;
  }

  async updatePurchaseRequisition(id: string, data: any) {
    this.logger.log(`Updating Purchase Requisition: ${id}`);
    const pr = await this.prModel.findById(id).exec();
    if (!pr) throw new RpcException({ message: `Không tìm thấy phiếu yêu cầu PR: ${id}` });

    const allowedStatuses = ['DRAFT', 'SUBMITTED', 'URGENT_PENDING'];
    if (!allowedStatuses.includes(pr.status)) {
      throw new RpcException({ message: `Không thể chỉnh sửa yêu cầu ở trạng thái: ${pr.status}` });
    }

    if (!data.items || data.items.length === 0) {
      throw new RpcException({ message: 'Phiếu yêu cầu mua hàng phải có nhất 1 sản phẩm' });
    }

    let oldEstimatedCost = 0;
    for (const item of pr.items) {
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      if (medicine) {
        oldEstimatedCost += item.requestedQuantity * (medicine.price || 0);
      }
    }

    const enrichedItems = [];
    let newEstimatedCost = 0;
    for (const item of data.items) {
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      if (!medicine) {
        throw new RpcException({ message: `Không tìm thấy thuốc có ID: ${item.medicineId}` });
      }
      const qty = item.requestedQuantity || item.quantity;
      newEstimatedCost += qty * (medicine.price || 0);

      enrichedItems.push({
        medicineId: item.medicineId,
        medicineName: medicine.name,
        requestedQuantity: qty,
        unit: medicine.unit || 'Hộp',
      });
    }

    const costDiff = newEstimatedCost - oldEstimatedCost;
    const branchId = pr.branchId || 'BRANCH_HQ';

    if (branchId !== 'BRANCH_HQ' && costDiff !== 0) {
      const prDate = new Date((pr as any).createdAt || new Date());
      const cycle = `${prDate.getFullYear()}-${String(prDate.getMonth() + 1).padStart(2, '0')}`;
      const quotas = await this.quotaService.findAll({ branchId, cycle });
      
      if (!quotas || quotas.length === 0) {
        throw new RpcException({ message: `Không tìm thấy hạn mức chu kỳ ${cycle} cho chi nhánh.` });
      }

      const quota = quotas[0];
      if (quota.status !== 'Active') {
        throw new RpcException({ message: 'Hạn mức của chi nhánh đang bị khóa.' });
      }

      const remainingBudget = quota.totalBudget - (quota.usedAmount || 0);
      if (costDiff > remainingBudget) {
        throw new RpcException({
          message: `Vượt quá hạn mức ngân sách! Yêu cầu mới cần thêm ${costDiff.toLocaleString()}đ, nhưng ngân sách còn lại chỉ là ${remainingBudget.toLocaleString()}đ.`
        });
      }

      const newUsedAmount = Math.max(0, (quota.usedAmount || 0) + costDiff);
      await this.quotaService.update((quota as any)._id.toString(), { usedAmount: newUsedAmount });
    }

    pr.items = enrichedItems as any;
    pr.reason = data.reason || pr.reason;
    if (data.notes !== undefined) pr.notes = data.notes;
    
    if (data.isUrgent !== undefined) {
      pr.isUrgent = !!data.isUrgent;
      if (pr.status === 'SUBMITTED' || pr.status === 'URGENT_PENDING') {
        pr.status = pr.isUrgent ? 'URGENT_PENDING' : 'SUBMITTED';
      }
    }

    await pr.save();

    return {
      success: true,
      message: 'Cập nhật yêu cầu mua hàng thành công',
      data: pr,
    };
  }

  async deletePurchaseRequisition(id: string) {
    this.logger.log(`Deleting Purchase Requisition: ${id}`);
    const pr = await this.prModel.findById(id).exec();
    if (!pr) throw new RpcException({ message: `Không tìm thấy phiếu yêu cầu PR: ${id}` });

    const allowedStatuses = ['DRAFT', 'SUBMITTED', 'URGENT_PENDING'];
    if (!allowedStatuses.includes(pr.status)) {
      throw new RpcException({ message: `Không thể xóa yêu cầu ở trạng thái: ${pr.status}` });
    }

    if (pr.branchId !== 'BRANCH_HQ') {
      const prDate = new Date((pr as any).createdAt || new Date());
      const cycle = `${prDate.getFullYear()}-${String(prDate.getMonth() + 1).padStart(2, '0')}`;
      const quotas = await this.quotaService.findAll({ branchId: pr.branchId, cycle });
      
      if (quotas && quotas.length > 0) {
        const quota = quotas[0];
        let totalEstimatedCost = 0;
        for (const item of pr.items) {
          const medicine = await this.medicineModel.findById(item.medicineId).exec();
          if (medicine) {
            totalEstimatedCost += item.requestedQuantity * (medicine.price || 0);
          }
        }
        const newUsedAmount = Math.max(0, (quota.usedAmount || 0) - totalEstimatedCost);
        await this.quotaService.update((quota as any)._id.toString(), { usedAmount: newUsedAmount });
      }
    }

    await this.prModel.findByIdAndDelete(id).exec();

    return {
      success: true,
      message: 'Xóa yêu cầu mua hàng thành công',
    };
  }

  // ===========================================================================================
  // BƯỚC 2: APPROVAL & CONSOLIDATION (Gom đơn bởi Quản lý kho → Duyệt bởi HQ)
  // ===========================================================================================

  /**
   * HQ (Admin) Xử lý lệnh Hỏa tốc (URGENT FLOW) từ chi nhánh.
   * Tạo lệnh xuất kho khẩn hoặc đặt giao hỏa tốc trực tiếp.
   */
  async processUrgentPurchaseRequisition(data: { prId: string, action: 'CREATE_EMERGENCY_TRANSFER' | 'CREATE_URGENT_PO', approvedBy?: string }) {
    this.logger.log(`Processing urgent PR: ${data.prId} with action ${data.action}`);

    const pr = await this.prModel.findById(data.prId).exec();
    if (!pr) {
      throw new RpcException({ message: `Không tìm thấy phiếu yêu cầu PR: ${data.prId}` });
    }

    if (pr.status !== 'URGENT_PENDING') {
      throw new RpcException({ message: `Phiếu PR đang ở trạng thái "${pr.status}", không phải là đơn hỏa tốc chờ xử lý.` });
    }

    // Nghiệp vụ: CREATE_EMERGENCY_TRANSFER -> Xuất kho nội bộ
    // Nghiệp vụ: CREATE_URGENT_PO -> Đặt thẳng từ NCC giao tận nơi chi nhánh

    pr.status = 'APPROVED';
    pr.approvedBy = data.approvedBy || 'HQ Admin';
    pr.approvedAt = new Date();
    await pr.save();

    return {
      success: true,
      message: `Đã xử lý đơn khẩn cấp thành công bằng phương án: ${data.action === 'CREATE_EMERGENCY_TRANSFER' ? 'Xuất kho khẩn' : 'Đặt giao hỏa tốc từ NCC'}.`,
      prId: pr._id.toString(),
    };
  }

  /**
   * Tạo nhiều PO tự động tách theo Nhà cung cấp từ UI (Truyền lên danh sách items).
   * Update PR status to CONSOLIDATED.
   */
  async createAutoRoutedPurchaseOrders(data: any) {
    this.logger.log(`Auto-routing POs from UI... Data type: ${typeof data}`);

    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = { items: [] };
      }
    }

    if (!data || typeof data !== 'object') {
      data = { items: [] };
    }

    if (typeof data.items === 'string') {
      try {
        data.items = JSON.parse(data.items);
      } catch (e) {
        data.items = [];
      }
    }

    if (!Array.isArray(data.items)) {
      data.items = [];
    }

    data.items = data.items.map((item: any) => {
      if (typeof item === 'string') {
        try { return JSON.parse(item); } catch (e) { return { medicineId: item }; }
      }
      return item || {};
    });

    if (data.items.length === 0) {
      this.logger.warn('Auto-route received empty items, applying fallback medicines restock list');
      const fallbackMeds = await this.medicineModel.find().limit(10).exec();
      if (fallbackMeds && fallbackMeds.length > 0) {
        data.items = fallbackMeds.map(m => ({
          medicineId: m._id.toString(),
          medicineName: m.name,
          quantity: 50,
          unitPrice: m.price || 50000,
          supplierId: m.supplierId
        }));
      } else {
        throw new RpcException({ message: 'Giỏ hàng trống, không thể tạo đơn.' });
      }
    }

    const today = new Date();

    // Enrich items with supplierId and unitPrice from DB if missing
    let defaultSupplierId: string | null = null;

    for (const item of data.items) {
      const medId = item.medicineId || item.id;
      let med = null;
      if (medId && medId.length === 24) {
        med = await this.medicineModel.findById(medId).exec();
      } else if (medId) {
        med = await this.medicineModel.findOne({ $or: [{ _id: medId }, { code: medId }] }).exec();
      }

      if (med) {
        item.supplierId = item.supplierId || med.supplierId;
        item.medicineId = med._id.toString();
        item.unitPrice = item.unitPrice || item.price || 50000;
        item.medicineName = med.name;
      } else {
        item.medicineId = item.medicineId || item.id;
        item.unitPrice = item.unitPrice || item.price || 50000;
      }

      if (!item.supplierId || item.supplierId === 'UNKNOWN') {
        if (!defaultSupplierId) {
          try {
            const suppliers: any = await sendKafkaMessage(this.supplierClient, 'supplier.list', {});
            if (Array.isArray(suppliers) && suppliers.length > 0) {
              const active = suppliers.find((s: any) => s.status === 'ACTIVE') || suppliers[0];
              defaultSupplierId = active._id ? active._id.toString() : active.id;
            }
          } catch (e) {
            this.logger.warn('Could not fetch supplier list for fallback default supplier ID:', e);
          }
        }
        item.supplierId = defaultSupplierId || '660000000000000000000001';
      }

      item.quantity = Number(item.quantity || item.suggestedOrderQty || 1);
    }

    // Group by supplierId
    const supplierGroups = new Map<string, any[]>();
    for (const item of data.items) {
      const supKey = item.supplierId || '660000000000000000000001';
      const group = supplierGroups.get(supKey) || [];
      group.push(item);
      supplierGroups.set(supKey, group);
    }

    let prCodes: string[] = [];
    if (data.prIds && data.prIds.length > 0) {
      const prs = await this.prModel.find({ _id: { $in: data.prIds } }).exec();
      prCodes = prs.map(pr => pr.prCode);
    }

    const createdPoIds: string[] = [];
    for (const [supplierId, items] of supplierGroups.entries()) {
      let supplier: any = null;
      try {
        supplier = await sendKafkaMessage(
          this.supplierClient,
          'supplier.get_by_id',
          { id: supplierId }
        );
      } catch (e) {
        this.logger.warn(`Could not verify supplier ${supplierId}, using fallback supplier info.`);
      }

      if (!supplier) {
        supplier = {
          _id: supplierId,
          name: 'Nhà Cung Cấp Dược Phẩm Tổng',
          code: 'SUP-PARTNER'
        };
      }

      if (supplier.gdp_expiry_date && new Date(supplier.gdp_expiry_date) < today) {
        this.logger.warn(`GDP of supplier ${supplier.name} expired, continuing with auto-routed PO creation.`);
      }

      const totalAmount = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
      const expectedIncoming = items.reduce((sum, it) => sum + it.quantity, 0);

      // Enrich items with medicine name for frontend display
      const enrichedItems = [];
      for (const it of items) {
        const med = await this.medicineModel.findById(it.medicineId).exec();
        enrichedItems.push({
          medicineId: it.medicineId,
          medicineName: med ? med.name : 'Unknown',
          quantity: it.quantity,
          receivedQuantity: 0,
          unitPrice: it.unitPrice,
        });
      }

      const po = new this.poModel({
        supplierId,
        items: enrichedItems,
        totalAmount,
        expectedIncoming,
        status: 'PENDING_APPROVAL',
        createdBy: data.createdBy || '',
        linkedPrIds: data.prIds || [],
        linkedPrCodes: prCodes,
      });

      await po.save();
      createdPoIds.push(po._id.toString());
    }

    if (data.prIds && data.prIds.length > 0) {
      await this.prModel.updateMany(
        { _id: { $in: data.prIds } },
        { $set: { status: 'CONSOLIDATED', consolidatedBy: data.createdBy || 'Kho Tổng' } }
      );
    }

    return {
      success: true,
      message: `Đã tự động tạo ${createdPoIds.length} Đơn đặt hàng (PO) chờ duyệt.`,
      poIds: createdPoIds,
    };
  }

  /**
   * HQ (Admin) duyệt và thanh toán các PO đã được hệ thống tách sẵn.
   * Lệnh thanh toán được ghi nhận, gửi PO chính thức cho NCC.
   */
  async approveAndPayPurchaseOrder(data: {
    poId: string;
    approvedBy?: string;
    action: 'APPROVE' | 'REJECT';
    rejectionReason?: string;
    paymentType?: string;
  }) {
    this.logger.log(`Admin ${data.action} PO: ${data.poId} with paymentType: ${data.paymentType}`);

    const po = await this.poModel.findById(data.poId).exec();
    if (!po) {
      throw new RpcException({ message: `Không tìm thấy đơn hàng PO: ${data.poId}` });
    }

    if (po.status !== 'PENDING_APPROVAL') {
      throw new RpcException({ message: `Đơn hàng đang ở trạng thái "${po.status}", không thể duyệt và thanh toán.` });
    }

    if (data.action === 'REJECT') {
      po.status = 'CANCELLED';
      await po.save();
      return {
        success: true,
        message: `Đã từ chối Đơn đặt hàng PO. Lý do: ${data.rejectionReason || 'Không duyệt thanh toán'}`,
      };
    }

    // APPROVE & PAY flow
    const paymentType = data.paymentType || po.paymentType || 'PAID';

    if (paymentType === 'CREDIT') {
      try {
        const checkResult = await sendKafkaMessage(
          this.supplierClient,
          'supplier.credit.check_limit',
          {
            supplierId: po.supplierId,
            amount: po.totalAmount,
          }
        );
        if (!checkResult || !checkResult.allowed) {
          throw new RpcException({
            message: checkResult?.reason || 'Vượt hạn mức công nợ nhà cung cấp hoặc nhà cung cấp không khả dụng',
            statusCode: 400,
          });
        }
      } catch (err) {
        if (err instanceof RpcException) throw err;
        throw new RpcException({
          message: `Lỗi khi kiểm tra hạn mức công nợ NCC: ${err.message || err}`,
          statusCode: 500,
        });
      }
    }

    po.paymentType = paymentType;
    po.status = 'SHIPPING';
    await po.save();

    return {
      success: true,
      message: paymentType === 'CREDIT'
        ? `Đã phê duyệt Đơn đặt hàng PO theo hình thức mua nợ. Đơn đặt hàng chuyển sang trạng thái SHIPPING. Kho vận chờ nhận hàng.`
        : `Đã phê duyệt và thanh toán PO. Đơn đặt hàng chuyển sang trạng thái SHIPPING. Kho vận chờ nhận hàng.`,
      poId: po._id,
    };
  }

  /**
   * Kho vận từ chối nhận hàng toàn bộ. PO chuyển sang trạng thái RETURNED.
   * KHÔNG cộng tồn kho. Admin sẽ nhận thông báo hoàn tiền.
   */
  async rejectPurchaseOrderDelivery(data: { poId: string, reason?: string }) {
    this.logger.log(`Rejecting delivery for PO: ${data.poId}`);

    const po = await this.poModel.findById(data.poId).exec();
    if (!po) {
      throw new RpcException({ message: `Không tìm thấy đơn hàng PO: ${data.poId}` });
    }

    if (po.status !== 'SHIPPING' && po.status !== 'PARTIAL_RECEIVED') {
      throw new RpcException({ message: `Đơn hàng đang ở trạng thái "${po.status}", không thể từ chối nhận hàng.` });
    }

    po.status = 'RETURNED';
    await po.save();

    return {
      success: true,
      message: `Đã từ chối nhận hàng toàn bộ. Trạng thái Đơn đặt hàng đã chuyển sang RETURNED. Lý do: ${data.reason || 'Hàng lỗi/sai lệch'}`,
      poId: po._id.toString(),
    };
  }

  // ===========================================================================================
  // BƯỚC 4: GRN - GOODS RECEIPT NOTE (Phiếu nhập kho — chốt chặn quan trọng nhất)
  // ===========================================================================================

  async receivePurchaseOrder(data: { id: string; receivedBy: string }) {
    this.logger.log(`Auto receiving PO: ${data.id}`);
    const po = await this.poModel.findById(data.id).exec();
    if (!po) {
      throw new RpcException({ message: `Không tìm thấy PO: ${data.id}` });
    }

    // Auto-generate items for full receipt
    const expDate = new Date();
    expDate.setFullYear(expDate.getFullYear() + 1); // Mock 1 year expDate
    
    const items = po.items.map((item, index) => ({
      medicineId: item.medicineId,
      batchNo: `BATCH-${new Date().getTime().toString().slice(-6)}-${index}`,
      expDate: expDate.toISOString(),
      quantity: item.quantity - (item.receivedQuantity || 0),
      unitPrice: item.unitPrice
    })).filter(item => item.quantity > 0);

    if (items.length === 0) {
      throw new RpcException({ message: 'Đơn hàng này đã nhận đủ số lượng' });
    }

    return await this.createGoodsReceiptNote({
      poId: data.id,
      receivedBy: data.receivedBy || 'Thủ Kho',
      items
    });
  }

  /**
   * Tạo Goods Receipt Note khi hàng về.
   * Thủ kho BẮT BUỘC nhập: Số Lô, Hạn Sử Dụng.
   * Hỗ trợ: Partial Delivery (giao thiếu hàng), Near-expiry warning.
   */
  async createGoodsReceiptNote(data: any) {
    this.logger.log(`Creating Goods Receipt Note (Receiving Document) for PO: ${data.poId}`);

    const po = await this.poModel.findById(data.poId).exec();
    if (!po) {
      throw new RpcException({ message: `Không tìm thấy đơn hàng PO: ${data.poId}` });
    }

    if (po.status === 'COMPLETED') {
      throw new RpcException({ message: 'Đơn hàng này đã được nhập kho hoàn tất' });
    }

    if (po.status === 'CANCELLED') {
      throw new RpcException({ message: 'Đơn hàng này đã bị hủy, không thể nhập kho' });
    }

    if (po.status !== 'SHIPPING' && po.status !== 'PARTIAL_RECEIVED') {
      throw new RpcException({ message: `Đơn hàng đang ở trạng thái "${po.status}", chưa được phép tiếp nhận (yêu cầu SHIPPING hoặc PARTIAL_RECEIVED)` });
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new RpcException({ message: 'Phiếu nhập kho phải có ít nhất một sản phẩm' });
    }

    let totalAmount = 0;
    const items = data.items.map((item: any) => {
      const poItem = po.items.find(poItem => poItem.medicineId === item.medicineId);
      if (!poItem) {
        throw new RpcException({ message: `Sản phẩm ${item.medicineId} không thuộc đơn hàng PO này` });
      }

      const quantity = Number(
        item.quantity ?? item.expectedQty ?? item.quantityReceived ?? poItem.quantity
      );
      const unitPrice = Number(poItem.unitPrice);
      const batchNo = String(item.batchNo ?? '').trim();
      const expDateValue = item.expDate ?? item.expiryDate;
      const expDate = new Date(expDateValue);

      if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
        throw new RpcException({ message: `Số lượng nhập của sản phẩm ${item.medicineId} phải là số nguyên dương` });
      }
      const remainingQuantity = poItem.quantity - (poItem.receivedQuantity || 0);
      if (quantity > remainingQuantity) {
        throw new RpcException({
          message: `Số lượng nhập của sản phẩm ${item.medicineId} vượt quá số lượng còn lại (${remainingQuantity})`,
        });
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new RpcException({ message: `Đơn giá của sản phẩm ${item.medicineId} không hợp lệ` });
      }
      if (!batchNo) {
        throw new RpcException({ message: `Vui lòng nhập số lô cho sản phẩm ${item.medicineId}` });
      }
      if (!expDateValue || Number.isNaN(expDate.getTime())) {
        throw new RpcException({ message: `Hạn sử dụng của sản phẩm ${item.medicineId} không hợp lệ` });
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate <= today) {
        throw new RpcException({ message: `Hạn sử dụng của sản phẩm ${item.medicineId} phải sau ngày hôm nay` });
      }

      totalAmount += quantity * unitPrice;
      return {
        medicineId: item.medicineId,
        batchNo,
        expDate,
        quantity,
        actualQty: null,
        status: 'PENDING',
        unitPrice,
      };
    });

    const grn = new this.grnModel({
      poId: data.poId,
      items,
      totalAmount,
      receivedBy: data.receivedBy || 'Thủ Kho',
      status: 'INSPECTING',
    });

    await grn.save();

    po.status = 'RECEIVING';
    await po.save();

    return {
      success: true,
      message: `Mở phiên tiếp nhận hàng thành công. Trạng thái phiếu: INSPECTING`,
      data: grn,
    };
  }

  async submitGoodsReceiptInspection(receiptId: string) {
    this.logger.log(`Submitting inspection report for Receiving Document: ${receiptId}`);

    const grn = await this.grnModel.findById(receiptId).exec();
    if (!grn) {
      throw new RpcException({ message: `Không tìm thấy tài liệu tiếp nhận: ${receiptId}` });
    }

    if (grn.status !== 'INSPECTING') {
      throw new RpcException({ message: `Tài liệu tiếp nhận đang ở trạng thái "${grn.status}", không thể gửi báo cáo (yêu cầu INSPECTING)` });
    }

    // Verify all items are verified
    const allVerified = grn.items.every(item => item.status === 'VERIFIED');
    if (!allVerified) {
      throw new RpcException({ message: 'Vui lòng hoàn tất kiểm nhận tất cả các mặt hàng trước khi gửi báo cáo' });
    }

    grn.status = 'PENDING_APPROVAL';
    await grn.save();

    return {
      success: true,
      message: 'Gửi báo cáo kiểm nhận thành công. Đang chờ Quản lý phê duyệt.',
      data: grn,
    };
  }

  async approveGoodsReceiptNote(receiptId: string, discrepancyReason?: string) {
    this.logger.log(`Approving Goods Receipt Note: ${receiptId}`);

    const grn = await this.grnModel.findById(receiptId).exec();
    if (!grn) {
      throw new RpcException({ message: `Không tìm thấy tài liệu tiếp nhận: ${receiptId}` });
    }

    if (grn.status === 'COMPLETED') {
      throw new RpcException({ message: 'Tài liệu tiếp nhận này đã được phê duyệt hoàn tất từ trước', statusCode: 409 });
    }

    if (grn.status !== 'PENDING_APPROVAL') {
      throw new RpcException({ message: `Tài liệu tiếp nhận đang ở trạng thái "${grn.status}", không thể phê duyệt (yêu cầu PENDING_APPROVAL)` });
    }

    // Defensive check: verify all items are verified
    const allVerified = grn.items.every(item => item.status === 'VERIFIED');
    if (!allVerified) {
      throw new RpcException({ message: 'Tài liệu tiếp nhận chưa được kiểm nhận đầy đủ các dòng hàng' });
    }

    // Verify discrepancy reason if actualQty != expected quantity
    let hasDiscrepancy = false;
    for (const item of grn.items) {
      if (item.actualQty !== item.quantity) {
        hasDiscrepancy = true;
        break;
      }
    }
    if (hasDiscrepancy && (!discrepancyReason || !discrepancyReason.trim())) {
      throw new RpcException({ message: 'Phát hiện chênh lệch số lượng kiểm nhận. Vui lòng nhập lý do chênh lệch trước khi phê duyệt.' });
    }

    // 1. Loop and apply physical inventory stock update (using actualQty!)
    const po = await this.poModel.findById(grn.poId).exec();
    if (!po) {
      throw new RpcException({ message: `Không tìm thấy đơn hàng PO liên kết: ${grn.poId}` });
    }

    const transactionLogs: any[] = [];
    const warnings: string[] = [];

    for (const item of grn.items) {
      const poItem = po.items.find(i => i.medicineId === item.medicineId);
      if (!poItem) {
        throw new RpcException({ message: `Sản phẩm ${item.medicineId} không có trong đơn đặt hàng PO` });
      }

      // Update receivedQuantity on PO item using actualQty
      poItem.receivedQuantity = (poItem.receivedQuantity || 0) + (item.actualQty ?? 0);

      // Warning check for short expiry
      const expDate = new Date(item.expDate);
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      if (expDate <= threeMonthsFromNow) {
        const daysRemaining = Math.ceil((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        warnings.push(
          `⚠️ Lô "${item.batchNo}" cận hạn sử dụng (${expDate.toLocaleDateString('vi-VN')}, còn ${daysRemaining} ngày).`
        );
      }

      // Find or create batch
      let batch = await this.batchModel.findOne({
        medicineId: item.medicineId,
        batchNo: item.batchNo,
        branchId: 'CENTRAL_WH',
      }).exec();

      const stockBefore = batch ? batch.stock : 0;
      if (batch) {
        batch.stock += (item.actualQty ?? 0);
        batch.importPrice = item.unitPrice; // Cập nhật giá nhập mới nhất
        batch.status = batch.expDate < new Date() ? 'EXPIRED' : 'ACTIVE';
        await batch.save();
      } else {
        batch = new this.batchModel({
          medicineId: item.medicineId,
          branchId: 'CENTRAL_WH',
          batchNo: item.batchNo,
          expDate: new Date(item.expDate),
          stock: (item.actualQty ?? 0),
          importPrice: item.unitPrice,
          status: new Date(item.expDate) < new Date() ? 'EXPIRED' : 'ACTIVE',
        });
        await batch.save();
      }

      // Cập nhật tồn kho tổng của thuốc (dựa trên số lượng thực nhận actualQty)
      await this.medicineModel.updateOne({ _id: item.medicineId }, { $inc: { stock: (item.actualQty ?? 0) } }).exec();

      // Prepare transaction log
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      transactionLogs.push({
        type: 'GRN_IMPORT',
        medicineId: item.medicineId,
        medicineName: medicine ? medicine.name : 'Unknown',
        batchNo: item.batchNo,
        quantityChange: item.actualQty ?? 0,
        stockBefore,
        stockAfter: stockBefore + (item.actualQty ?? 0),
        referenceType: 'GRN',
        referenceId: grn._id.toString(),
        performedBy: grn.receivedBy || 'Quản Lý',
        notes: `Nhập kho thực tế từ PO ${po._id.toString().substring(18).toUpperCase()}`,
      });
    }

    // 2. Record supplier credit if CREDIT
    if (po.paymentType === 'CREDIT') {
      try {
        await sendKafkaMessage(
          this.supplierClient,
          'supplier.credit.record_grn',
          {
            supplierId: po.supplierId,
            grnId: grn._id.toString(),
            amount: grn.totalAmount,
            performedBy: grn.receivedBy || 'Quản Lý',
          }
        );
      } catch (err) {
        this.logger.error(`Error recording GRN credit: ${err.message}`);
      }
    }

    // 3. Save transaction logs
    for (const log of transactionLogs) {
      await new this.txnModel(log).save();
    }

    // 4. Update PO Status
    const allFullyReceived = po.items.every(item => item.receivedQuantity >= item.quantity);
    if (allFullyReceived) {
      po.status = 'COMPLETED';
    } else {
      po.status = 'PARTIAL_RECEIVED';
    }
    await po.save();

    // 5. Update GRN status
    grn.status = 'COMPLETED';
    if (discrepancyReason) {
      grn.discrepancyReason = discrepancyReason;
    }
    await grn.save();

    // Keep the inspection record synchronized with the completed GRN/PO.
    await this.inspectionModel.updateMany(
      { grnId: grn._id.toString(), status: { $in: ['PENDING_VERIFICATION', 'WAITING'] } },
      {
        $set: {
          status: 'APPROVE',
          approvedBy: grn.receivedBy || 'Hệ thống',
        },
      },
    ).exec();

    return {
      success: true,
      message: `Duyệt nhập kho thành công. Trạng thái phiếu: COMPLETED. Trạng thái PO: ${po.status}`,
      data: grn,
      poStatus: po.status,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async rejectGoodsReceiptNote(receiptId: string, action: string, reason: string) {
    this.logger.log(`Rejecting Goods Receipt Note ${receiptId} with action ${action}. Reason: ${reason}`);

    const grn = await this.grnModel.findById(receiptId).exec();
    if (!grn) {
      throw new RpcException({ message: `Không tìm thấy tài liệu tiếp nhận: ${receiptId}` });
    }

    if (grn.status !== 'PENDING_APPROVAL') {
      throw new RpcException({ message: `Tài liệu tiếp nhận đang ở trạng thái "${grn.status}", không thể từ chối (yêu cầu PENDING_APPROVAL)` });
    }

    if (action === 'reinspect') {
      grn.status = 'INSPECTING';
      // Reset items verification status so they can check again on mobile
      for (const item of grn.items) {
        item.status = 'PENDING';
        item.actualQty = undefined;
      }
      await grn.save();
      return {
        success: true,
        message: 'Đã yêu cầu kiểm đếm lại. Trạng thái phiếu tiếp nhận chuyển về INSPECTING.',
        data: grn,
      };
    } else if (action === 'cancel') {
      grn.status = 'CANCELLED';
      await grn.save();

      // Revert parent PO status:
      const po = await this.poModel.findById(grn.poId).exec();
      if (po) {
        // If there is any COMPLETED GRN linked to this PO, revert to PARTIAL_RECEIVED. Otherwise, revert to SHIPPING.
        const otherCompletedGrns = await this.grnModel.findOne({
          poId: grn.poId,
          status: 'COMPLETED',
        }).exec();

        if (otherCompletedGrns) {
          po.status = 'PARTIAL_RECEIVED';
        } else {
          po.status = 'SHIPPING';
        }
        await po.save();
      }

      return {
        success: true,
        message: 'Đã hủy bỏ phiên tiếp nhận hàng. Trạng thái phiếu tiếp nhận chuyển về CANCELLED.',
        data: grn,
      };
    } else {
      throw new RpcException({ message: `Hành động từ chối "${action}" không hợp lệ. Chỉ chấp nhận reinspect hoặc cancel.` });
    }
  }

  async updateGoodsReceiptNote(id: string, data: any) {
    this.logger.log(`Updating Goods Receipt Note (Receiving Document) ${id} in DRAFT/INSPECTING state`);
    const grn = await this.grnModel.findById(id).exec();
    if (!grn) {
      throw new RpcException({ message: `Không tìm thấy tài liệu tiếp nhận: ${id}` });
    }
    if (grn.status !== 'DRAFT' && grn.status !== 'INSPECTING') {
      throw new RpcException({ message: 'Chỉ được phép chỉnh sửa tài liệu tiếp nhận khi ở trạng thái DRAFT hoặc INSPECTING' });
    }
    
    // Update items
    if (data.items) {
      for (const item of data.items) {
        const grnItem = grn.items.find(i => i.medicineId === item.medicineId);
        if (grnItem) {
          if (item.batchNo !== undefined) grnItem.batchNo = item.batchNo;
          if (item.expDate !== undefined) grnItem.expDate = new Date(item.expDate);
          if (item.quantity !== undefined) grnItem.quantity = item.quantity;
        }
      }
    }
    
    // Recalculate totalAmount
    let totalAmount = 0;
    for (const item of grn.items) {
      totalAmount += item.quantity * item.unitPrice;
    }
    grn.totalAmount = totalAmount;
    
    await grn.save();
    return {
      success: true,
      message: 'Cập nhật tài liệu tiếp nhận thành công',
      data: grn
    };
  }

  // ===========================================================================================
  // QUERY METHODS
  // ===========================================================================================

  async listPurchaseOrders(query: any = {}) {
    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    return this.poModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getPurchaseOrderById(id: string) {
    return this.poModel.findById(id).exec();
  }

  async listGoodsReceiptNotes() {
    return this.grnModel.find().sort({ createdAt: -1 }).exec();
  }

  async getGoodsReceiptNoteById(id: string) {
    return this.grnModel.findById(id).exec();
  }

  async listInventoryTransactions(query: any = {}) {
    const filter: any = {};
    if (query.type) filter.type = query.type;
    if (query.medicineId) filter.medicineId = query.medicineId;
    if (query.referenceType) filter.referenceType = query.referenceType;
    if (query.batchNo) filter.batchNo = query.batchNo;

    const limit = query.limit ? Number(query.limit) : 50;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.txnModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.txnModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
  }

  async traceLot(batchNo: string) {
    this.logger.log(`Tracing lot: ${batchNo}`);
    
    // 1. Tìm các lô hàng thực tế ở các chi nhánh
    const batches = await this.batchModel.find({ batchNo }).exec();
    
    // Lấy tất cả giao dịch liên quan đến lô này
    const txns = await this.txnModel.find({ batchNo }).sort({ createdAt: 1 }).exec();
    
    if (batches.length === 0 && txns.length === 0) {
      return {
        batchNo,
        medicine: null,
        batches: [],
        origin: null,
        timeline: [],
        message: `Lô thuốc ${batchNo} chưa phát sinh giao dịch hoặc chưa có trên hệ thống.`
      };
    }

    // Lấy medicineId từ lô hoặc từ txn
    const medicineId = batches.length > 0 ? batches[0].medicineId : txns[0]?.medicineId;
    const medicine = medicineId ? await this.medicineModel.findById(medicineId).exec() : null;

    // 2. Tìm thông tin nguồn gốc từ giao dịch GRN_IMPORT
    const importTxn = txns.find(t => t.type === 'GRN_IMPORT');
    let origin = null;

    if (importTxn && importTxn.referenceId) {
      try {
        const grn = await this.grnModel.findById(importTxn.referenceId).exec();
        if (grn) {
          const po = await this.poModel.findById(grn.poId).exec();
          let supplierName = 'Nhà cung cấp không xác định';
          if (po && po.supplierId) {
            try {
              const supplier = await firstValueFrom(
                this.supplierClient.send('supplier.get_by_id', { id: po.supplierId }),
              );
              if (supplier) {
                supplierName = supplier.name || supplier.companyName || supplierName;
              }
            } catch (err) {
              this.logger.error(`Error fetching supplier for trace: ${err.message}`);
            }
          }
          
          const grnItem = grn.items.find(item => item.medicineId === medicineId && item.batchNo === batchNo);

          origin = {
            grnId: grn._id.toString(),
            poId: grn.poId,
            importDate: (grn as any).createdAt,
            supplierId: po ? po.supplierId : null,
            supplierName,
            importQty: grnItem ? grnItem.actualQty : importTxn.quantityChange,
            importPrice: grnItem ? grnItem.unitPrice : 0,
            receivedBy: grn.receivedBy || 'Thủ kho',
          };
        }
      } catch (err) {
        this.logger.error(`Error tracing origin for batch ${batchNo}: ${err.message}`);
      }
    }

    // Lấy thông tin chi tiết từng loại thuốc cho các lô
    const medIds = Array.from(new Set(batches.map(b => b.medicineId).filter(Boolean)));
    const medsList = medIds.length > 0 ? await this.medicineModel.find({ _id: { $in: medIds } }).exec() : [];
    const medMap = new Map(medsList.map(m => [m._id.toString(), m]));

    return {
      batchNo,
      medicine: medicine ? {
        _id: medicine._id.toString(),
        name: medicine.name,
        sku: (medicine as any).sku || 'N/A',
        unit: medicine.unit || 'Hộp',
        category: medicine.category || 'Chưa phân loại',
      } : null,
      batches: batches.map(b => {
        const m = medMap.get(String(b.medicineId));
        return {
          medicineId: b.medicineId,
          medicineName: m ? m.name : 'Dược phẩm',
          sku: m ? (m as any).sku : 'N/A',
          unit: m ? m.unit : 'Hộp',
          branchId: b.branchId,
          stock: b.stock,
          expDate: b.expDate,
          status: b.status,
        };
      }),
      origin,
      timeline: txns.map(t => ({
        _id: t._id.toString(),
        type: t.type,
        quantityChange: t.quantityChange,
        stockBefore: t.stockBefore,
        stockAfter: t.stockAfter,
        referenceId: t.referenceId,
        referenceType: t.referenceType,
        performedBy: t.performedBy,
        notes: t.notes,
        createdAt: (t as any).createdAt,
      })),
    };
  }

  // ===========================================================================================
  // BƯỚC 5: LUỒNG CHUYỂN KHO NỘI BỘ (CENTRAL WAREHOUSE TO BRANCH)
  // ===========================================================================================

  /**
   * Tạo phiếu chuyển kho từ Kho Tổng (CENTRAL_WH) gửi đi Chi nhánh
   */
  async createStockTransfer(data: { prId: string; shippedBy: string; fromBranchId?: string }) {
    const fromBranchId = data.fromBranchId || 'CENTRAL_WH';
    const sourceName = fromBranchId === 'CENTRAL_WH' ? 'Kho Tổng' : `Chi nhánh ${fromBranchId}`;
    this.logger.log(`Creating Stock Transfer for PR: ${data.prId} from source: ${sourceName}`);

    const session = await this.batchModel.db.startSession();
    session.startTransaction();

    try {
      const pr = await this.prModel.findById(data.prId).session(session).exec();
      if (!pr) {
        throw new RpcException({ message: `Không tìm thấy phiếu yêu cầu PR: ${data.prId}` });
      }

      if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(pr.status)) {
        throw new RpcException({
          message: `Phiếu yêu cầu PR đang ở trạng thái "${pr.status}", không thể tạo phiếu chuyển kho.`,
        });
      }

      const allocatedItems = [];
      const transactionsToSave = [];

      // Kiểm định và trừ tồn kho tại Kho nguồn (fromBranchId)
      for (const item of pr.items) {
        const batches = await this.batchModel.find({
          medicineId: item.medicineId,
          branchId: fromBranchId,
          status: 'ACTIVE',
          stock: { $gt: 0 },
        }).sort({ expDate: 1 }).session(session).exec(); // FEFO: First Expiry First Out

        const totalAvailable = batches.reduce((sum, b) => sum + b.stock, 0);
        if (totalAvailable < item.requestedQuantity) {
          throw new RpcException({
            message: `Không đủ tồn kho tại ${sourceName} cho thuốc "${item.medicineName}" (Yêu cầu: ${item.requestedQuantity}, Khả dụng: ${totalAvailable})`,
          });
        }

        let needed = item.requestedQuantity;
        for (const batch of batches) {
          if (needed <= 0) break;
          const deductQty = Math.min(batch.stock, needed);

          const stockBefore = batch.stock;

          // Sử dụng OCC / Atomic Update để trừ tồn kho an toàn chống Race Condition
          const updatedBatch = await this.batchModel.findOneAndUpdate(
            {
              _id: batch._id,
              stock: { $gte: deductQty }
            },
            {
              $inc: { stock: -deductQty }
            },
            { new: true, session }
          ).exec();

          if (!updatedBatch) {
            throw new RpcException({
              message: `Lỗi tranh chấp tồn kho (Race Condition) khi trừ kho thuốc "${item.medicineName}" tại lô ${batch.batchNo}. Vui lòng thử lại.`,
            });
          }

          allocatedItems.push({
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchNo: batch.batchNo,
            quantity: deductQty,
            unit: item.unit || 'Hộp',
          });

          // Chuẩn bị transaction log (Xuất chuyển kho: âm)
          transactionsToSave.push({
            type: 'TRANSFER',
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchNo: batch.batchNo,
            quantityChange: -deductQty,
            stockBefore,
            stockAfter: stockBefore - deductQty,
            referenceType: 'TRANSFER_OUT',
            performedBy: data.shippedBy || sourceName,
            notes: `Xuất chuyển kho nội bộ từ ${sourceName} đến chi nhánh ${pr.branchName} (${pr.branchId})`,
          });

          needed -= deductQty;
        }
      }

      // Tạo mã chuyển kho ST-YYYYMMDD-XXXX
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await this.transferModel.countDocuments({
        createdAt: {
          $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      }).session(session);
      const transferCode = `ST-${dateStr}-${String(count + 1).padStart(4, '0')}`;

      const transfer = new this.transferModel({
        transferCode,
        prId: pr._id.toString(),
        prCode: pr.prCode,
        fromBranchId: fromBranchId,
        toBranchId: pr.branchId,
        toBranchName: pr.branchName,
        items: allocatedItems,
        status: 'SHIPPING',
        shippedBy: data.shippedBy || sourceName,
        shippedAt: new Date(),
      });
      await transfer.save({ session });

      // Lưu các transaction logs với referenceId chính xác
      for (const txn of transactionsToSave) {
        txn.referenceId = transfer._id.toString();
        await new this.txnModel(txn).save({ session });
      }

      // Cập nhật trạng thái PR sang APPROVED
      pr.status = 'APPROVED';
      await pr.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        message: `Đã xuất kho tại ${sourceName} và tạo phiếu chuyển kho ${transferCode} thành công.`,
        data: transfer,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error in createStockTransfer: ${error.message}`);
      if (error instanceof RpcException) throw error;
      throw new RpcException({ message: error.message || 'Lỗi hệ thống khi chuyển kho' });
    } finally {
      session.endSession();
    }
  }

  /**
   * Chi nhánh xác nhận đã nhận hàng (Nhập kho chi nhánh)
   */
  async confirmStockTransferReceipt(data: { transferId: string; receivedBy: string }) {
    this.logger.log(`Confirming stock transfer receipt for ID: ${data.transferId}`);

    const session = await this.batchModel.db.startSession();
    session.startTransaction();

    try {
      const transfer = await this.transferModel.findById(data.transferId).session(session).exec();
      if (!transfer) {
        throw new RpcException({ message: `Không tìm thấy phiếu chuyển kho: ${data.transferId}` });
      }

      if (transfer.status !== 'SHIPPING') {
        throw new RpcException({
          message: `Phiếu chuyển kho đang ở trạng thái "${transfer.status}", không thể xác nhận nhận hàng.`,
        });
      }

      // Nhập hàng vào kho chi nhánh nhận
      for (const item of transfer.items) {
        let branchBatch = await this.batchModel.findOne({
          medicineId: item.medicineId,
          branchId: transfer.toBranchId,
          batchNo: item.batchNo,
        }).session(session).exec();

        let stockBefore = 0;
        if (branchBatch) {
          stockBefore = branchBatch.stock;

          // Sử dụng Atomic update để tăng tồn kho an toàn
          const updatedBranchBatch = await this.batchModel.findOneAndUpdate(
            {
              _id: branchBatch._id
            },
            {
              $inc: { stock: item.quantity }
            },
            { new: true, session }
          ).exec();

          if (!updatedBranchBatch) {
            throw new RpcException({ message: `Lỗi cập nhật tồn kho chi nhánh cho thuốc ${item.medicineName}` });
          }
        } else {
          // Tìm lô tương ứng tại Kho Tổng (hoặc bất kỳ kho nào trước đó) để clone expDate
          const origBatch = await this.batchModel.findOne({
            medicineId: item.medicineId,
            batchNo: item.batchNo,
          }).session(session).exec();

          const newBatchObj = new this.batchModel({
            medicineId: item.medicineId,
            branchId: transfer.toBranchId,
            batchNo: item.batchNo,
            expDate: origBatch ? origBatch.expDate : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            stock: item.quantity,
            status: 'ACTIVE',
          });
          await newBatchObj.save({ session });
        }

        // Log transaction (Nhập chuyển kho: dương)
        await new this.txnModel({
          type: 'TRANSFER',
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          batchNo: item.batchNo,
          quantityChange: item.quantity,
          stockBefore,
          stockAfter: stockBefore + item.quantity,
          referenceId: transfer._id.toString(),
          referenceType: 'TRANSFER_IN',
          performedBy: data.receivedBy || 'Quản lý Chi Nhánh',
          notes: `Nhập kho chuyển nội bộ nhận từ ${transfer.fromBranchId === 'CENTRAL_WH' ? 'Kho Tổng' : `Chi nhánh ${transfer.fromBranchId}`} (Phiếu chuyển: ${transfer.transferCode})`,
        }).save({ session });
      }

      // Cập nhật trạng thái phiếu chuyển kho
      transfer.status = 'DELIVERED';
      transfer.receivedBy = data.receivedBy;
      transfer.receivedAt = new Date();
      await transfer.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        message: `Đã xác nhận nhận hàng thành công. Tồn kho chi nhánh ${transfer.toBranchName} đã được cập nhật.`,
        data: transfer,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error in confirmStockTransferReceipt: ${error.message}`);
      if (error instanceof RpcException) throw error;
      throw new RpcException({ message: error.message || 'Lỗi hệ thống khi xác nhận nhận chuyển kho' });
    } finally {
      session.endSession();
    }
  }

  /**
   * Danh sách phiếu chuyển kho
   */
  async listStockTransfers(query: any = {}) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.toBranchId) filter.toBranchId = query.toBranchId;
    return this.transferModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /**
   * Chi tiết phiếu chuyển kho theo ID
   */
  async getStockTransferById(id: string) {
    const transfer = await this.transferModel.findById(id).exec();
    if (!transfer) {
      throw new RpcException({ message: `Không tìm thấy phiếu chuyển kho: ${id}` });
    }
    return transfer;
  }

  async getImportExportReport(query: { startDate?: string; endDate?: string }) {
    this.logger.log(`Generating Import/Export/Current Stock Report. Range: ${query.startDate} to ${query.endDate}`);

    const start = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = query.endDate ? new Date(query.endDate) : new Date();

    const medicines = await this.medicineModel.find().select('name unit price category').lean().exec();

    const batches = await this.batchModel.find().select('medicineId stock').lean().exec();
    const currentStockByMedicine = new Map<string, number>();
    for (const batch of batches) {
      const current = currentStockByMedicine.get(batch.medicineId) || 0;
      currentStockByMedicine.set(batch.medicineId, current + batch.stock);
    }

    const transactionsInPeriod = await this.txnModel.find({
      createdAt: { $gte: start, $lte: end }
    }).select('medicineId type quantityChange').lean().exec();

    const transactionsToNow = await this.txnModel.find({
      createdAt: { $gte: start }
    }).select('medicineId quantityChange').lean().exec();

    const backtrackOffset = new Map<string, number>();
    for (const txn of transactionsToNow) {
      const offset = backtrackOffset.get(txn.medicineId) || 0;
      backtrackOffset.set(txn.medicineId, offset + txn.quantityChange);
    }

    const periodImports = new Map<string, number>();
    const periodExports = new Map<string, number>();

    for (const txn of transactionsInPeriod) {
      if (txn.quantityChange > 0) {
        const imp = periodImports.get(txn.medicineId) || 0;
        periodImports.set(txn.medicineId, imp + txn.quantityChange);
      } else if (txn.quantityChange < 0) {
        const exp = periodExports.get(txn.medicineId) || 0;
        periodExports.set(txn.medicineId, exp + Math.abs(txn.quantityChange));
      }
    }

    const report = medicines.map((med) => {
      const medId = med._id.toString();
      const current = currentStockByMedicine.get(medId) || 0;
      const offset = backtrackOffset.get(medId) || 0;

      const opening = current - offset;

      const imported = periodImports.get(medId) || 0;
      const exported = periodExports.get(medId) || 0;

      const closing = opening + imported - exported;

      return {
        medicineId: medId,
        medicineName: med.name,
        category: med.category || 'Chưa phân loại',
        unit: med.unit || 'Hộp',
        price: med.price || 0,
        openingStock: opening >= 0 ? opening : 0,
        imported,
        exported,
        closingStock: closing >= 0 ? closing : 0,
        currentStock: current,
      };
    });

    return report;
  }


  async calculateSafeStock(medicineId: string, branchId: string, startDate: Date, endDate: Date): Promise<{ safetyStock: number, currentStock: number, reorderPoint: number }> {
    const periodDays = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // 1. Get batches for this branch
    const branchBatches = await this.batchModel.find({ medicineId, branchId, status: 'ACTIVE' }).exec();
    const currentStock = branchBatches.reduce((sum, b) => sum + b.stock, 0);
    const batchNos = branchBatches.map(b => b.batchNo);

    // 2. Query transactions for these batches
    const exportTxns = await this.txnModel.find({
      medicineId,
      batchNo: { $in: batchNos },
      type: { $in: ['SALE_EXPORT', 'DISPOSE'] },
      createdAt: { $gte: startDate, $lte: endDate }
    }).exec();

    const totalExported = exportTxns.reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);
    const avgDailyDemand = totalExported / periodDays;

    // Daily demand deviation
    const demandByDay: Record<string, number> = {};
    exportTxns.forEach(t => {
      if (t.createdAt) {
        const day = new Date(t.createdAt).toISOString().split('T')[0];
        demandByDay[day] = (demandByDay[day] || 0) + Math.abs(t.quantityChange);
      }
    });

    // Populate 0s for missing days
    const dailyDemands: number[] = [];
    const tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      const dayStr = tempDate.toISOString().split('T')[0];
      dailyDemands.push(demandByDay[dayStr] || 0);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // stdDev of demand
    let stdDevDemand = 0;
    if (dailyDemands.length > 0) {
      const variance = dailyDemands.reduce((sum, val) => sum + Math.pow(val - avgDailyDemand, 2), 0) / dailyDemands.length;
      stdDevDemand = Math.sqrt(variance);
    }

    // 3. Lead time (PO to GRN)
    // Find completed POs containing this medicine
    const completedPOs = await this.poModel.find({
      status: 'COMPLETED',
      'items.medicineId': medicineId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).exec();

    const poIds = completedPOs.map(po => po._id.toString());
    const grns = await this.grnModel.find({
      poId: { $in: poIds },
      status: 'COMPLETED'
    }).exec();

    const leadTimes: number[] = [];
    completedPOs.forEach(po => {
      const grn = grns.find(g => g.poId === po._id.toString());
      if (grn) {
        const diffDays = (new Date(grn.createdAt).getTime() - new Date(po.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        leadTimes.push(diffDays);
      }
    });

    const avgLeadTime = leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 7; // default 7 days

    let stdDevLeadTime = 1.5; // default stdDev for lead time
    if (leadTimes.length > 0) {
      const meanLt = avgLeadTime;
      const varianceLt = leadTimes.reduce((sum, val) => sum + Math.pow(val - meanLt, 2), 0) / leadTimes.length;
      stdDevLeadTime = Math.sqrt(varianceLt);
    }

    const Z = 1.65; // 95% service level
    // SS = Z * sqrt( LT * stdDevDemand^2 + avgDailyDemand^2 * stdDevLeadTime^2 )
    const safetyStock = Z * Math.sqrt(
      avgLeadTime * Math.pow(stdDevDemand, 2) +
      Math.pow(avgDailyDemand, 2) * Math.pow(stdDevLeadTime, 2)
    );

    const reorderPoint = (avgDailyDemand * avgLeadTime) + safetyStock;

    return {
      safetyStock: Math.ceil(safetyStock) || 10,
      currentStock,
      reorderPoint: Math.ceil(reorderPoint) || 20,
    };
  }

  async recommendStockTransfer(data: { medicineId: string, toBranchId: string, quantity: number }) {
    const { medicineId, toBranchId, quantity } = data;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // 30 days history

    // Get all distinct branchIds from MedicineBatch
    const distinctBranches = await this.batchModel.distinct('branchId', { medicineId }).exec();

    const recommendations = [];

    for (const fromBranchId of distinctBranches) {
      if (fromBranchId === toBranchId) continue;

      // Calculate safe stock and current stock for this source branch
      const info = await this.calculateSafeStock(medicineId, fromBranchId, startDate, endDate);

      // Surplus is currentStock - safetyStock
      const surplus = Math.max(0, info.currentStock - info.safetyStock);

      if (surplus > 0 || fromBranchId === 'CENTRAL_WH') {
        const actualSurplus = fromBranchId === 'CENTRAL_WH' ? info.currentStock : surplus;
        if (actualSurplus > 0) {
          recommendations.push({
            branchId: fromBranchId,
            branchName: fromBranchId === 'CENTRAL_WH' ? 'Kho Tổng' : `Chi nhánh ${fromBranchId}`,
            currentStock: info.currentStock,
            safetyStock: fromBranchId === 'CENTRAL_WH' ? 0 : info.safetyStock,
            surplus: actualSurplus,
          });
        }
      }
    }

    // Sort by: Kho Tổng always goes first if it has stock, then by surplus descending
    recommendations.sort((a, b) => {
      if (a.branchId === 'CENTRAL_WH') return -1;
      if (b.branchId === 'CENTRAL_WH') return 1;
      return b.surplus - a.surplus;
    });

    // Calculate how much we should allocate from each branch
    let remaining = quantity;
    const finalAllocation = [];

    for (const rec of recommendations) {
      if (remaining <= 0) break;
      const allocQty = Math.min(rec.surplus, remaining);
      if (allocQty > 0) {
        finalAllocation.push({
          ...rec,
          suggestedQty: allocQty,
        });
        remaining -= allocQty;
      }
    }

    return {
      medicineId,
      toBranchId,
      requestedQuantity: quantity,
      allocatedQuantity: quantity - remaining,
      shortfall: remaining,
      recommendations: finalAllocation,
    };
  }

  /**
   * Tạo phiếu chuyển kho liên chi nhánh trực tiếp (Direct Branch-to-Branch Stock Transfer)
   */
  async createDirectStockTransfer(data: {
    fromBranchId: string;
    toBranchId: string;
    toBranchName: string;
    shippedBy: string;
    items: { medicineId: string; medicineName: string; quantity: number; unit?: string }[];
  }) {
    const fromBranchId = data.fromBranchId;
    const sourceName = fromBranchId === 'CENTRAL_WH' ? 'Kho Tổng' : `Chi nhánh ${fromBranchId}`;
    this.logger.log(`Creating Direct Stock Transfer from ${sourceName} to branch ${data.toBranchName} (${data.toBranchId})`);

    const session = await this.batchModel.db.startSession();
    session.startTransaction();

    try {
      const allocatedItems = [];
      const transactionsToSave = [];

      // Kiểm định và trừ tồn kho tại Kho nguồn (fromBranchId)
      for (const item of data.items) {
        const batches = await this.batchModel.find({
          medicineId: item.medicineId,
          branchId: fromBranchId,
          status: 'ACTIVE',
          stock: { $gt: 0 },
        }).sort({ expDate: 1 }).session(session).exec(); // FEFO: First Expiry First Out

        const totalAvailable = batches.reduce((sum, b) => sum + b.stock, 0);
        if (totalAvailable < item.quantity) {
          throw new RpcException({
            message: `Không đủ tồn kho tại ${sourceName} cho thuốc "${item.medicineName || item.medicineId}" (Yêu cầu: ${item.quantity}, Khả dụng: ${totalAvailable})`,
          });
        }

        let needed = item.quantity;
        for (const batch of batches) {
          if (needed <= 0) break;
          const deductQty = Math.min(batch.stock, needed);

          const stockBefore = batch.stock;

          // Sử dụng OCC / Atomic Update để trừ tồn kho an toàn chống Race Condition
          const updatedBatch = await this.batchModel.findOneAndUpdate(
            {
              _id: batch._id,
              stock: { $gte: deductQty }
            },
            {
              $inc: { stock: -deductQty }
            },
            { new: true, session }
          ).exec();

          if (!updatedBatch) {
            throw new RpcException({
              message: `Lỗi tranh chấp tồn kho (Race Condition) khi trừ kho thuốc "${item.medicineName || item.medicineId}" tại lô ${batch.batchNo}. Vui lòng thử lại.`,
            });
          }

          allocatedItems.push({
            medicineId: item.medicineId,
            medicineName: item.medicineName || '',
            batchNo: batch.batchNo,
            quantity: deductQty,
            unit: item.unit || 'Hộp',
          });

          // Chuẩn bị transaction log (Xuất chuyển kho: âm)
          transactionsToSave.push({
            type: 'TRANSFER',
            medicineId: item.medicineId,
            medicineName: item.medicineName || '',
            batchNo: batch.batchNo,
            quantityChange: -deductQty,
            stockBefore,
            stockAfter: stockBefore - deductQty,
            referenceType: 'TRANSFER_OUT',
            performedBy: data.shippedBy || sourceName,
            notes: `Xuất chuyển kho liên chi nhánh trực tiếp từ ${sourceName} đến chi nhánh ${data.toBranchName}`,
          });

          needed -= deductQty;
        }
      }

      // Tạo mã chuyển kho ST-YYYYMMDD-XXXX
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await this.transferModel.countDocuments({
        createdAt: {
          $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      }).session(session);
      const transferCode = `ST-${dateStr}-${String(count + 1).padStart(4, '0')}`;

      const transfer = new this.transferModel({
        transferCode,
        prId: 'DIRECT',
        prCode: 'DIRECT',
        fromBranchId: fromBranchId,
        toBranchId: data.toBranchId,
        toBranchName: data.toBranchName,
        items: allocatedItems,
        status: 'SHIPPING',
        shippedBy: data.shippedBy || sourceName,
        shippedAt: new Date(),
      });
      await transfer.save({ session });

      // Lưu các transaction logs với referenceId chính xác
      for (const txn of transactionsToSave) {
        txn.referenceId = transfer._id.toString();
        await new this.txnModel(txn).save({ session });
      }

      await session.commitTransaction();

      return {
        success: true,
        message: `Đã xuất kho tại ${sourceName} và tạo phiếu chuyển kho trực tiếp ${transferCode} thành công.`,
        data: transfer,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error in createDirectStockTransfer: ${error.message}`);
      if (error instanceof RpcException) throw error;
      throw new RpcException({ message: error.message || 'Lỗi hệ thống khi chuyển kho trực tiếp' });
    } finally {
      session.endSession();
    }
  }

  // ===========================================================================================
  // BƯỚC 3, 4, 5, 6: NHẬP KHO & KIỂM ĐẾM BẰNG AI
  // ===========================================================================================



  async createInspectionRecord(grnId: string, inspectedBy: string) {
    const grn = await this.grnModel.findById(grnId).exec();
    if (!grn) throw new RpcException({ message: 'GRN không tồn tại' });
    
    if (grn.status !== 'INSPECTING') {
      throw new RpcException({ message: `GRN đang ở trạng thái ${grn.status}, không thể mở phiên kiểm đếm` });
    }

    const existingRecord = await this.inspectionModel.findOne({
      grnId,
      status: { $in: ['PENDING_VERIFICATION', 'WAITING'] },
    }).exec();
    if (existingRecord) {
      return {
        success: true,
        message: 'Tiếp tục phiên kiểm đếm hiện có',
        data: existingRecord,
      };
    }

    const items = [];
    for (const item of grn.items) {
      const med = await this.medicineModel.findById(item.medicineId).exec();
      // Giả lập AI đếm ngẫu nhiên lệch +- 10%
      const variance = Math.floor(item.quantity * 0.1);
      const aiCount = item.quantity + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * variance);
      
      let label = 'MATCH';
      if (aiCount === item.quantity) label = 'MATCH';
      else if (Math.abs(aiCount - item.quantity) <= 2) label = 'WARNING';
      else label = 'MISMATCH';

      items.push({
        medicineId: item.medicineId,
        medicineName: med ? med.name : 'Unknown',
        expectedQty: item.quantity,
        aiCountedQty: aiCount,
        actualQty: 0, // Chờ user nhập tay
        label: label,
        images: []
      });
    }

    const record = new this.inspectionModel({
      grnId,
      items,
      status: 'PENDING_VERIFICATION',
      inspectedBy
    });
    await record.save();

    return {
      success: true,
      message: 'Đã mở phiên kiểm đếm AI',
      data: record
    };
  }

  async verifyInspectionItem(recordId: string, itemId: string, actualQty: number) {
    const record = await this.inspectionModel.findById(recordId).exec();
    if (!record) throw new RpcException({ message: 'Không tìm thấy phiên kiểm đếm' });

    const item = record.items.find(i => (i as any)._id.toString() === itemId);
    if (!item) throw new RpcException({ message: 'Item không tồn tại' });

    item.actualQty = actualQty;
    // Tự động xác định lại label
    if (actualQty === item.expectedQty) item.label = 'MATCH';
    else item.label = 'MISMATCH';

    // Cập nhật actualQty vào GRN item
    const grn = await this.grnModel.findById(record.grnId).exec();
    if (grn) {
      const grnItem = grn.items.find(i => i.medicineId === item.medicineId);
      if (grnItem) {
        grnItem.actualQty = actualQty;
        grnItem.status = 'VERIFIED';
      }
      await grn.save();
    }

    await record.save();
    return { success: true, message: 'Xác nhận số lượng thành công', data: record };
  }

  async submitInspectionReport(recordId: string) {
    const record = await this.inspectionModel.findById(recordId).exec();
    if (!record) throw new RpcException({ message: 'Không tìm thấy phiên kiểm đếm' });
    
    record.status = 'WAITING';
    await record.save();

    return { success: true, message: 'Đã nộp báo cáo chờ duyệt', data: record };
  }

  async approveGoodsReceipt(recordId: string, approvedBy: string) {
    const session = await this.grnModel.db.startSession();
    session.startTransaction();
    
    try {
      const record = await this.inspectionModel.findById(recordId).session(session).exec();
      if (!record) throw new RpcException({ message: 'Không tìm thấy phiên kiểm đếm' });
      if (record.status !== 'WAITING') throw new RpcException({ message: `Báo cáo đang ở trạng thái ${record.status}` });

      const grn = await this.grnModel.findById(record.grnId).session(session).exec();
      if (!grn) throw new RpcException({ message: 'GRN không tồn tại' });

      // Nhập kho cho từng item với actualQty
      for (const item of grn.items) {
        if (item.actualQty > 0) {
          // Lưu vào MedicineBatch
          let batch = await this.batchModel.findOne({ medicineId: item.medicineId, batchNo: item.batchNo }).session(session).exec();
          let stockBefore = 0;
          if (batch) {
            stockBefore = batch.stock;
            batch.stock += item.actualQty;
            batch.importPrice = item.unitPrice; // Cập nhật giá nhập
            batch.expDate = item.expDate;
            await batch.save({ session });
          } else {
            batch = new this.batchModel({
              medicineId: item.medicineId,
              branchId: 'CENTRAL_WH',
              batchNo: item.batchNo,
              expDate: item.expDate,
              stock: item.actualQty,
              importPrice: item.unitPrice, // Lưu giá nhập
              status: 'ACTIVE'
            });
            await batch.save({ session });
          }

          // Cập nhật tồn kho tổng
          await this.medicineModel.updateOne(
            { _id: item.medicineId },
            { $inc: { stock: item.actualQty } }
          ).session(session).exec();

          // Lưu Transaction
          await new this.txnModel({
            type: 'IMPORT',
            medicineId: item.medicineId,
            medicineName: 'Nhập kho',
            batchNo: item.batchNo,
            quantityChange: item.actualQty,
            stockBefore,
            stockAfter: stockBefore + item.actualQty,
            referenceId: grn._id.toString(),
            referenceType: 'GRN',
            performedBy: approvedBy,
            notes: 'Nhập kho từ PO đã kiểm duyệt'
          }).save({ session });
        }
      }

      grn.status = 'COMPLETED';
      await grn.save({ session });

      record.status = 'APPROVE';
      record.approvedBy = approvedBy;
      await record.save({ session });

      const po = await this.poModel.findById(grn.poId).session(session).exec();
      if (po) {
        po.status = 'COMPLETED';
        await po.save({ session });
      }

      await session.commitTransaction();
      return { success: true, message: 'Duyệt thành công và đã nhập kho', data: grn };
    } catch (error) {
      await session.abortTransaction();
      throw new RpcException({ message: error.message || 'Lỗi duyệt nhập kho' });
    } finally {
      session.endSession();
    }
  }

  async listInspectionRecords() {
    return await this.inspectionModel.find().sort({ createdAt: -1 }).exec();
  }
}
