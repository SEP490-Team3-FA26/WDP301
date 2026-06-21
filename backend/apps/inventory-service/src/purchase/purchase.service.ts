import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseRequisition } from './schemas/purchase-requisition.schema';
import { PurchaseOrder } from './schemas/purchase-order.schema';
import { GoodsReceiptNote } from './schemas/goods-receipt-note.schema';
import { InventoryTransaction } from './schemas/inventory-transaction.schema';
import { Medicine } from '../medicine/schemas/medicine.schema';
import { MedicineBatch } from '../medicine/schemas/medicine-batch.schema';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    @Inject('SUPPLIER_SERVICE') private readonly supplierClient: ClientKafka,
    @InjectModel(PurchaseRequisition.name) private readonly prModel: Model<PurchaseRequisition>,
    @InjectModel(PurchaseOrder.name) private readonly poModel: Model<PurchaseOrder>,
    @InjectModel(GoodsReceiptNote.name) private readonly grnModel: Model<GoodsReceiptNote>,
    @InjectModel(InventoryTransaction.name) private readonly txnModel: Model<InventoryTransaction>,
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
  ) { }

  async onModuleInit() {
    this.supplierClient.subscribeToResponseOf('supplier.get_by_id');
    await this.supplierClient.connect();
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

    // Enrichment: lấy tên thuốc + đơn vị để denormalize
    const enrichedItems = [];
    for (const item of data.items) {
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      if (!medicine) {
        throw new RpcException({ message: `Không tìm thấy thuốc có ID: ${item.medicineId}` });
      }
      enrichedItems.push({
        medicineId: item.medicineId,
        medicineName: medicine.name,
        requestedQuantity: item.requestedQuantity || item.quantity,
        unit: medicine.unit || 'Hộp',
      });
    }

    // Generate PR code: PR-YYYYMMDD-XXXX
    const today = new Date();
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
      prId: pr._id,
    };
  }


  /**
   * Tạo nhiều PO tự động tách theo Nhà cung cấp từ UI (Truyền lên danh sách items).
   * Update PR status to CONSOLIDATED.
   */
  async createAutoRoutedPurchaseOrders(data: { items: any[], prIds: string[], createdBy?: string }) {
    this.logger.log(`Auto-routing POs from UI... PRs: ${data.prIds?.join(', ')}`);

    if (!data.items || data.items.length === 0) {
      throw new RpcException({ message: 'Giỏ hàng trống, không thể tạo đơn.' });
    }

    const today = new Date();
    
    // Enrich items with supplierId from DB if missing
    for (const item of data.items) {
      const med = await this.medicineModel.findById(item.medicineId || item.id).exec();
      if (!med) throw new RpcException({ message: `Không tìm thấy thuốc có ID: ${item.medicineId || item.id}` });
      item.supplierId = med.supplierId || 'UNKNOWN';
      item.medicineId = item.medicineId || item.id;
    }

    // Group by supplierId
    const supplierGroups = new Map<string, any[]>();
    for (const item of data.items) {
      if (item.supplierId === 'UNKNOWN') {
        throw new RpcException({ message: `Sản phẩm chưa có Nhà cung cấp mặc định trong hệ thống.` });
      }
      const group = supplierGroups.get(item.supplierId) || [];
      group.push(item);
      supplierGroups.set(item.supplierId, group);
    }

    const createdPoIds: string[] = [];
    for (const [supplierId, items] of supplierGroups.entries()) {
      let supplier;
      try {
        supplier = await firstValueFrom(
          this.supplierClient.send('supplier.get_by_id', { id: supplierId })
        );
      } catch (e) {
        throw new RpcException({ message: `Không thể thẩm định NCC: ${supplierId}` });
      }

      if (!supplier) {
        throw new RpcException({ message: `Không tìm thấy NCC: ${supplierId}` });
      }

      if (supplier.gdp_expiry_date && new Date(supplier.gdp_expiry_date) < today) {
        throw new RpcException({ message: `GDP của NCC "${supplier.name}" đã HẾT HẠN. Yêu cầu gia hạn!` });
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
  async approveAndPayPurchaseOrder(data: { poId: string; approvedBy?: string; action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) {
    this.logger.log(`Admin ${data.action} PO: ${data.poId}`);

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
    po.status = 'SHIPPING';
    await po.save();

    return {
      success: true,
      message: `Đã phê duyệt và thanh toán PO. Đơn đặt hàng chuyển sang trạng thái SHIPPING. Kho vận chờ nhận hàng.`,
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
      poId: po._id,
    };
  }



  // ===========================================================================================
  // BƯỚC 4: GRN - GOODS RECEIPT NOTE (Phiếu nhập kho — chốt chặn quan trọng nhất)
  // ===========================================================================================

  /**
   * Tạo Goods Receipt Note khi hàng về.
   * Thủ kho BẮT BUỘC nhập: Số Lô, Hạn Sử Dụng.
   * Hỗ trợ: Partial Delivery (giao thiếu hàng), Near-expiry warning.
   */
  async createGoodsReceiptNote(data: any) {
    this.logger.log(`Creating Goods Receipt Note for PO: ${data.poId}`);

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
      throw new RpcException({ message: `Đơn hàng đang ở trạng thái "${po.status}", chưa được phép nhập kho (yêu cầu SHIPPING hoặc PARTIAL_RECEIVED)` });
    }

    // Kiểm tra và xử lý từng item
    let totalAmount = 0;
    const warnings: string[] = [];
    const transactionLogs: any[] = [];

    for (const item of data.items) {
      // Tìm item trong PO để đối chiếu
      const poItem = po.items.find(i => i.medicineId === item.medicineId);
      if (!poItem) {
        throw new RpcException({ message: `Sản phẩm ${item.medicineId} không có trong đơn đặt hàng` });
      }

      // Tính remaining quantity (cho partial delivery)
      const remainingQuantity = poItem.quantity - poItem.receivedQuantity;
      if (item.quantity > remainingQuantity) {
        throw new RpcException({
          message: `Số lượng thực nhận (${item.quantity}) vượt quá số lượng còn lại chưa nhận (${remainingQuantity}) cho sản phẩm ${item.medicineId}`,
        });
      }

      // ⚠️ EDGE CASE: Kiểm tra hàng cận date (< 3 tháng)
      const expDate = new Date(item.expDate);
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      if (expDate <= threeMonthsFromNow) {
        const daysRemaining = Math.ceil((expDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        warnings.push(
          `⚠️ CẢNH BÁO CẬN DATE: Lô "${item.batchNo}" có hạn sử dụng ${expDate.toLocaleDateString('vi-VN')} (còn ${daysRemaining} ngày). Cần xem xét có tiếp nhận lô hàng này hay yêu cầu NCC đổi trả.`,
        );
      }

      totalAmount += item.quantity * item.unitPrice;

      // Tìm và lấy stock trước khi thay đổi (cho transaction log)
      let batch = await this.batchModel.findOne({
        medicineId: item.medicineId,
        batchNo: item.batchNo,
      }).exec();

      const stockBefore = batch ? batch.stock : 0;

      // Cập nhật hoặc tạo mới MedicineBatch
      if (batch) {
        batch.stock += item.quantity;
        batch.status = batch.expDate < new Date() ? 'EXPIRED' : 'ACTIVE';
        await batch.save();
      } else {
        batch = new this.batchModel({
          medicineId: item.medicineId,
          batchNo: item.batchNo,
          expDate: new Date(item.expDate),
          stock: item.quantity,
          status: new Date(item.expDate) < new Date() ? 'EXPIRED' : 'ACTIVE',
        });
        await batch.save();
      }

      // Cập nhật receivedQuantity trên PO item
      poItem.receivedQuantity += item.quantity;

      // Chuẩn bị transaction log
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      transactionLogs.push({
        type: 'GRN_IMPORT',
        medicineId: item.medicineId,
        medicineName: medicine ? medicine.name : 'Unknown',
        batchNo: item.batchNo,
        quantityChange: item.quantity, // Dương = nhập kho
        stockBefore,
        stockAfter: stockBefore + item.quantity,
        referenceType: 'GRN',
        performedBy: data.receivedBy || 'Thủ Kho',
        notes: `Nhập kho từ PO ${po._id.toString().substring(18).toUpperCase()}`,
      });
    }

    // Tạo Phiếu Nhập Kho (GRN)
    const grn = new this.grnModel({
      poId: data.poId,
      items: data.items,
      totalAmount,
      receivedBy: data.receivedBy || 'Thủ Kho',
      status: 'COMPLETED',
    });

    await grn.save();

    // Cập nhật referenceId cho transaction logs rồi lưu
    for (const log of transactionLogs) {
      log.referenceId = grn._id.toString();
      await new this.txnModel(log).save();
    }

    // Xác định trạng thái PO mới: COMPLETED hay PARTIAL_RECEIVED
    const allFullyReceived = po.items.every(item => item.receivedQuantity >= item.quantity);
    if (allFullyReceived) {
      po.status = 'COMPLETED';
    } else {
      po.status = 'PARTIAL_RECEIVED';
    }
    await po.save();

    return {
      success: true,
      message: `Tạo phiếu nhập kho thành công. Tồn kho đã được cập nhật. Trạng thái PO: ${po.status}`,
      data: grn,
      poStatus: po.status,
      warnings: warnings.length > 0 ? warnings : undefined,
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

    const limit = query.limit ? Number(query.limit) : 50;
    const page = query.page ? Number(query.page) : 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.txnModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.txnModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, limit };
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
}
