import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { PurchaseService } from './purchase.service';

@Controller()
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  // ===========================================================================================
  // BƯỚC 1: PR - PURCHASE REQUISITION
  // ===========================================================================================

  @MessagePattern('inventory.pr.create')
  async createPurchaseRequisition(@Payload() data: any) {
    try {
      return await this.purchaseService.createPurchaseRequisition(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo phiếu yêu cầu mua hàng');
    }
  }

  @MessagePattern('inventory.pr.list')
  async listPurchaseRequisitions(@Payload() query: any) {
    try {
      return await this.purchaseService.listPurchaseRequisitions(query);
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách PR');
    }
  }

  @MessagePattern('inventory.pr.get_by_id')
  async getPurchaseRequisitionById(@Payload() data: { id: string }) {
    try {
      return await this.purchaseService.getPurchaseRequisitionById(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết PR');
    }
  }

  @MessagePattern('inventory.pr.update_status')
  async updatePurchaseRequisitionStatus(@Payload() data: { id: string, status: string }) {
    try {
      return await this.purchaseService.updatePurchaseRequisitionStatus(data.id, data.status);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật trạng thái PR');
    }
  }

  // ===========================================================================================
  // BƯỚC 2: APPROVAL & CONSOLIDATION
  // ===========================================================================================



  @MessagePattern('inventory.po.approve_pay')
  async approveAndPayPurchaseOrder(@Payload() data: any) {
    try {
      return await this.purchaseService.approveAndPayPurchaseOrder(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi duyệt và thanh toán PO');
    }
  }

  @MessagePattern('inventory.pr.process_urgent')
  async processUrgentPurchaseRequisition(@Payload() data: any) {
    try {
      return await this.purchaseService.processUrgentPurchaseRequisition(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xử lý PR hỏa tốc');
    }
  }

  // ===========================================================================================
  // BƯỚC 3: PO - PURCHASE ORDER
  // ===========================================================================================

  @MessagePattern('inventory.po.auto_route')
  async createAutoRoutedPurchaseOrders(@Payload() data: any) {
    try {
      return await this.purchaseService.createAutoRoutedPurchaseOrders(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo đơn tự động tách');
    }
  }



  @MessagePattern('inventory.po.list')
  async listPurchaseOrders(@Payload() query: any) {
    try {
      return await this.purchaseService.listPurchaseOrders(query);
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách đơn nhập');
    }
  }

  @MessagePattern('inventory.po.get_by_id')
  async getPurchaseOrderById(@Payload() data: { id: string }) {
    try {
      return await this.purchaseService.getPurchaseOrderById(data.id);
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết đơn nhập');
    }
  }

  @MessagePattern('inventory.po.reject_delivery')
  async rejectPurchaseOrderDelivery(@Payload() data: any) {
    try {
      return await this.purchaseService.rejectPurchaseOrderDelivery(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi từ chối nhận hàng PO');
    }
  }

  @MessagePattern('inventory.po.receive')
  async receivePurchaseOrder(@Payload() data: any) {
    try {
      return await this.purchaseService.receivePurchaseOrder(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi nhận hàng PO');
    }
  }

  // ===========================================================================================
  // BƯỚC 4: GRN - GOODS RECEIPT NOTE
  // ===========================================================================================

  @MessagePattern('inventory.grn.create')
  async createGoodsReceiptNote(@Payload() data: any) {
    try {
      return await this.purchaseService.createGoodsReceiptNote(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo phiếu nhập kho');
    }
  }

  @MessagePattern('inventory.grn.list')
  async listGoodsReceiptNotes() {
    try {
      return await this.purchaseService.listGoodsReceiptNotes();
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách phiếu nhập kho');
    }
  }

  @MessagePattern('inventory.grn.get_by_id')
  async getGoodsReceiptNoteById(@Payload() data: { id: string }) {
    try {
      return await this.purchaseService.getGoodsReceiptNoteById(data.id);
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết phiếu nhập kho');
    }
  }

  // ===========================================================================================
  // INVENTORY TRANSACTIONS (Nhật ký biến động kho)
  // ===========================================================================================

  @MessagePattern('inventory.transactions.list')
  async listInventoryTransactions(@Payload() query: any) {
    try {
      return await this.purchaseService.listInventoryTransactions(query);
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy nhật ký biến động kho');
    }
  }

  @MessagePattern('inventory.reports.import_export')
  async getImportExportReport(@Payload() query: { startDate?: string; endDate?: string }) {
    try {
      return await this.purchaseService.getImportExportReport(query);
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy báo cáo nhập xuất tồn');
    }
  }

  // ===========================================================================================
  // BƯỚC 5: LUỒNG CHUYỂN KHO NỘI BỘ (STOCK TRANSFER)
  // ===========================================================================================

  @MessagePattern('inventory.transfer.create')
  async createStockTransfer(@Payload() data: { prId: string; shippedBy: string; fromBranchId?: string }) {
    try {
      return await this.purchaseService.createStockTransfer(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo phiếu chuyển kho');
    }
  }

  @MessagePattern('inventory.transfer.create_direct')
  async createDirectStockTransfer(
    @Payload() data: {
      fromBranchId: string;
      toBranchId: string;
      toBranchName: string;
      shippedBy: string;
      items: { medicineId: string; medicineName: string; quantity: number; unit?: string }[];
    }
  ) {
    try {
      return await this.purchaseService.createDirectStockTransfer(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo chuyển kho trực tiếp');
    }
  }

  @MessagePattern('inventory.transfer.receive')
  async confirmStockTransferReceipt(@Payload() data: { transferId: string; receivedBy: string }) {
    try {
      return await this.purchaseService.confirmStockTransferReceipt(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xác nhận nhận hàng');
    }
  }

  @MessagePattern('inventory.transfer.list')
  async listStockTransfers(@Payload() query: any) {
    try {
      return await this.purchaseService.listStockTransfers(query);
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách chuyển kho');
    }
  }

  @MessagePattern('inventory.transfer.get_by_id')
  async getStockTransferById(@Payload() data: { id: string }) {
    try {
      return await this.purchaseService.getStockTransferById(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết chuyển kho');
    }
  }
}
