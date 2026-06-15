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

  // ===========================================================================================
  // BƯỚC 2: APPROVAL & CONSOLIDATION
  // ===========================================================================================

  @MessagePattern('inventory.pr.consolidate')
  async consolidatePurchaseRequisitions(@Payload() data: any) {
    try {
      return await this.purchaseService.consolidatePurchaseRequisitions(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi gom đơn');
    }
  }

  @MessagePattern('inventory.pr.approve')
  async approvePurchaseRequisitions(@Payload() data: any) {
    try {
      return await this.purchaseService.approvePurchaseRequisitions(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi duyệt PR');
    }
  }

  // ===========================================================================================
  // BƯỚC 3: PO - PURCHASE ORDER
  // ===========================================================================================

  @MessagePattern('inventory.po.create')
  async createPurchaseOrder(@Payload() data: any) {
    try {
      return await this.purchaseService.createPurchaseOrder(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo đơn nhập');
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
}
