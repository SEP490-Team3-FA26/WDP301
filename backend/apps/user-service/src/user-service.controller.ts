import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { UserService } from './user-service.service';
import { BranchService } from './branch.service';
import { ExportJobStatusDto } from './dto/export-job-status.dto';

@Controller()
export class UserServiceController {
  constructor(
    private readonly userService: UserService,
    private readonly branchService: BranchService,
  ) { }

  @MessagePattern('user.edit_profile')
  handleEditProfile(@Payload() data: { userId: string; fullName?: string }) {
    return this.userService.editProfile(data.userId, data);
  }

  @MessagePattern('user.change_avatar')
  handleChangeAvatar(@Payload() data: { userId: string; avatarUrl: string }) {
    return this.userService.changeAvatar(data.userId, data.avatarUrl);
  }

  // --- CART MESSAGE PATTERNS ---

  @MessagePattern('user.cart.get')
  handleGetCart(@Payload() data: { userId: string }) {
    return this.userService.getCart(data.userId);
  }

  @MessagePattern('user.cart.add')
  handleAddToCart(@Payload() data: { userId: string; medicineId: string; quantity: number }) {
    return this.userService.addToCart(data.userId, data.medicineId, data.quantity);
  }

  @MessagePattern('user.cart.update')
  handleUpdateCartItem(@Payload() data: { userId: string; medicineId: string; quantity: number }) {
    return this.userService.updateCartItem(data.userId, data.medicineId, data.quantity);
  }

  @MessagePattern('user.cart.delete')
  handleDeleteCartItem(@Payload() data: { userId: string; medicineId: string }) {
    return this.userService.deleteCartItem(data.userId, data.medicineId);
  }

  @MessagePattern('user.cart.clear')
  handleClearCart(@Payload() data: { userId: string }) {
    return this.userService.clearCart(data.userId);
  }

  @MessagePattern('user.branch.list')
  handleListBranches() {
    return this.branchService.findAll();
  }


  @MessagePattern('user.branch.create')
  handleCreateBranch(@Payload() data: any) {
    return this.branchService.create(data);
  }

  @MessagePattern('user.branch.update')
  handleUpdateBranch(@Payload() data: { id: string; updateData: any }) {
    return this.branchService.update(data.id, data.updateData);
  }

  @MessagePattern('user.branch.delete')
  handleDeleteBranch(@Payload() data: { id: string }) {
    return this.branchService.delete(data.id);
  }

  @MessagePattern('user.loyalty.get')
  handleGetLoyalty(@Payload() data: { userId: string }) {
    return this.userService.getLoyaltyInfo(data.userId);
  }

  @MessagePattern('user.loyalty.lookup')
  handleLookupLoyalty(@Payload() data: { phone: string }) {
    return this.userService.lookupLoyaltyByPhone(data.phone);
  }

  @MessagePattern('user.loyalty.update_points')
  handleUpdatePoints(@Payload() data: { phone?: string; userId?: string; pointsDelta: number; accumulatedDelta?: number }) {
    return this.userService.updatePoints(data);
  }

  // --- ADMIN EMPLOYEE MANAGEMENT ---

  @MessagePattern('user.admin.employee.create')
  handleCreateEmployee(@Payload() data: any) {
    return this.userService.createEmployee(data);
  }

  @MessagePattern('user.admin.employee.list')
  handleListEmployees(@Payload() data: any) {
    return this.userService.listEmployees(data);
  }

  @MessagePattern('user.admin.employee.get')
  handleGetEmployee(@Payload() data: { id: string }) {
    return this.userService.getEmployeeById(data.id);
  }

  @MessagePattern('user.admin.employee.update')
  handleUpdateEmployee(@Payload() data: any) {
    return this.userService.updateEmployee(data.id, data);
  }

  @MessagePattern('user.admin.employee.ban_unban')
  handleToggleBanEmployee(@Payload() data: { id: string }) {
    return this.userService.toggleBanEmployee(data.id);
  }

  @EventPattern('user.branch.alert.low_stock')
  handleLowStockAlertEvent(@Payload() data: any) {
    return this.branchService.handleLowStockAlert(data);
  }

  @MessagePattern('audit.created')
  handleCreateAuditLog(@Payload() data: any) {
    return this.userService.createAuditLog(data);
  }

  @MessagePattern('user.audit.list')
  handleListAuditLogs(@Payload() query: any) {
    return this.userService.listAuditLogs(query);
  }

  @MessagePattern('user.audit.export')
  handleExportAuditLogs(@Payload() query: any) {
    return this.userService.exportAuditLogs(query);
  }

  @MessagePattern('user.audit.export_status')
  async handleExportAuditLogsStatus(@Payload() data: { jobId: string }): Promise < ExportJobStatusDto > {
    return this.userService.getExportJobStatus(data.jobId);
  }
}
