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

    const pr = new this.prModel({
      prCode,
      branchId: data.branchId || 'BRANCH_HQ',
      branchName: data.branchName || 'Chi nhánh chính',
      items: enrichedItems,
      reason: data.reason || '',
      notes: data.notes || '',
      status: 'SUBMITTED',
      createdBy: data.createdBy || '',
    });

    await pr.save();

    return {
      success: true,
      message: `Tạo yêu cầu mua hàng ${prCode} thành công. Đang chờ Quản lý kho gom đơn.`,
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
    return this.prModel.find(filter).sort({ createdAt: -1 }).exec();
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
   * Quản lý Kho gom các PR lại (đánh dấu CONSOLIDATED).
   * Quy trình: SUBMITTED → CONSOLIDATED (Kho gom) → APPROVED/REJECTED (HQ duyệt)
   */
  async consolidatePurchaseRequisitions(data: { prIds: string[]; consolidatedBy?: string }) {
    this.logger.log(`Consolidating PRs: ${data.prIds.join(', ')}`);

    if (!data.prIds || data.prIds.length === 0) {
      throw new RpcException({ message: 'Vui lòng chọn ít nhất 1 phiếu PR để gom đơn' });
    }

    const prs = await this.prModel.find({ _id: { $in: data.prIds } }).exec();

    // Validate: tất cả đều phải ở trạng thái SUBMITTED
    for (const pr of prs) {
      if (pr.status !== 'SUBMITTED') {
        throw new RpcException({
          message: `Phiếu ${pr.prCode} đang ở trạng thái "${pr.status}", chỉ được gom đơn ở trạng thái SUBMITTED`,
        });
      }
    }

    // Cập nhật trạng thái
    await this.prModel.updateMany(
      { _id: { $in: data.prIds } },
      {
        $set: {
          status: 'CONSOLIDATED',
          consolidatedBy: data.consolidatedBy || 'Warehouse Manager',
        },
      },
    );

    // Tính tổng hợp nhu cầu (gom sản phẩm trùng nhau từ nhiều chi nhánh)
    const consolidatedItems = new Map<string, { medicineId: string; medicineName: string; totalQuantity: number; unit: string; branches: string[] }>();
    for (const pr of prs) {
      for (const item of pr.items) {
        const existing = consolidatedItems.get(item.medicineId);
        if (existing) {
          existing.totalQuantity += item.requestedQuantity;
          if (!existing.branches.includes(pr.branchName)) {
            existing.branches.push(pr.branchName);
          }
        } else {
          consolidatedItems.set(item.medicineId, {
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            totalQuantity: item.requestedQuantity,
            unit: item.unit,
            branches: [pr.branchName],
          });
        }
      }
    }

    return {
      success: true,
      message: `Đã gom ${prs.length} phiếu PR thành công. Đang chờ Headquarters phê duyệt.`,
      consolidatedSummary: Array.from(consolidatedItems.values()),
      prCodes: prs.map(pr => pr.prCode),
    };
  }

  /**
   * HQ (Headquarters) phê duyệt các PR đã gom.
   * Nếu duyệt → tạo luôn PO draft (hoặc chuyển trạng thái để Kho vận tạo PO).
   */
  async approvePurchaseRequisitions(data: { prIds: string[]; approvedBy?: string; action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) {
    this.logger.log(`HQ ${data.action} PRs: ${data.prIds.join(', ')}`);

    if (!data.prIds || data.prIds.length === 0) {
      throw new RpcException({ message: 'Vui lòng chọn ít nhất 1 phiếu PR để duyệt' });
    }

    const prs = await this.prModel.find({ _id: { $in: data.prIds } }).exec();

    // Validate: tất cả đều phải ở trạng thái CONSOLIDATED
    for (const pr of prs) {
      if (pr.status !== 'CONSOLIDATED') {
        throw new RpcException({
          message: `Phiếu ${pr.prCode} chưa được Quản lý kho gom đơn (trạng thái hiện tại: "${pr.status}")`,
        });
      }
    }

    if (data.action === 'REJECT') {
      await this.prModel.updateMany(
        { _id: { $in: data.prIds } },
        {
          $set: {
            status: 'REJECTED',
            approvedBy: data.approvedBy || 'HQ Manager',
            rejectionReason: data.rejectionReason || 'Không đạt yêu cầu',
            approvedAt: new Date(),
          },
        },
      );

      return {
        success: true,
        message: `Đã từ chối ${prs.length} phiếu PR. Lý do: ${data.rejectionReason || 'Không đạt yêu cầu'}`,
      };
    }

    // APPROVE flow
    await this.prModel.updateMany(
      { _id: { $in: data.prIds } },
      {
        $set: {
          status: 'APPROVED',
          approvedBy: data.approvedBy || 'HQ Manager',
          approvedAt: new Date(),
        },
      },
    );

    return {
      success: true,
      message: `Đã phê duyệt ${prs.length} phiếu PR. Quản lý Kho có thể bắt đầu tạo Đơn Đặt Hàng (PO).`,
      approvedPrIds: data.prIds,
    };
  }

  // ===========================================================================================
  // BƯỚC 3: PO - PURCHASE ORDER (Đơn đặt hàng cho nhà cung cấp)
  // ===========================================================================================

  /**
   * Tạo Purchase Order. Kiểm tra GDP nhà cung cấp + số đăng ký thuốc.
   * Hàng chưa về nên CHƯA CÓ Số lô và HSD.
   */
  async createPurchaseOrder(data: any) {
    this.logger.log(`Creating Purchase Order for Supplier: ${data.supplierId}`);

    // 1. Thẩm định Pháp lý Nhà Cung Cấp (GDP) qua Kafka
    let supplier;
    try {
      supplier = await firstValueFrom(
        this.supplierClient.send('supplier.get_by_id', { id: data.supplierId })
      );
    } catch (e) {
      throw new RpcException({ message: 'Không thể kết nối đến Supplier Service để thẩm định' });
    }

    if (!supplier) {
      throw new RpcException({ message: 'Không tìm thấy thông tin Nhà cung cấp' });
    }

    const today = new Date();
    if (supplier.gdp_expiry_date && new Date(supplier.gdp_expiry_date) < today) {
      throw new RpcException({ message: `Giấy chứng nhận GDP của "${supplier.name}" đã HẾT HẠN vào ngày ${new Date(supplier.gdp_expiry_date).toLocaleDateString()}. Yêu cầu gia hạn hồ sơ trước khi nhập hàng!` });
    }

    // 2. Thẩm định Pháp lý Thuốc (Số đăng ký)
    for (const item of data.items) {
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      if (!medicine) {
        throw new RpcException({ message: `Không tìm thấy thuốc có ID: ${item.medicineId}` });
      }

      if (medicine.expiry_date && new Date(medicine.expiry_date) < today) {
        throw new RpcException({ message: `Số đăng ký của thuốc "${medicine.name}" đã hết hạn vào ngày ${new Date(medicine.expiry_date).toLocaleDateString()}. Không thể lên đơn nhập!` });
      }
    }

    // 3. Tạo Purchase Order
    const totalAmount = data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const expectedIncoming = data.items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    const po = new this.poModel({
      supplierId: data.supplierId,
      items: data.items.map((item: any) => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        receivedQuantity: 0, // Chưa nhận gì cả
        unitPrice: item.unitPrice,
      })),
      totalAmount,
      expectedIncoming,
      status: 'PENDING', // Đơn chờ nhập kho
      createdBy: data.createdBy || '',
      linkedPrId: data.linkedPrId || '', // Link PR nếu có
    });

    await po.save();

    // Nếu PO được tạo từ PR, cập nhật linkedPoId cho PR
    if (data.linkedPrId) {
      await this.prModel.findByIdAndUpdate(data.linkedPrId, { linkedPoId: po._id.toString() });
    }

    if (data.requisitionIds && Array.isArray(data.requisitionIds) && data.requisitionIds.length > 0) {
      await this.prModel.updateMany(
        { _id: { $in: data.requisitionIds } },
        { $set: { linkedPoId: po._id.toString() } }
      );
    }

    return {
      success: true,
      message: 'Tạo đơn hàng thành công, chờ nhập kho. Pipeline/Incoming Stock đã tăng.',
      data: po,
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
}
