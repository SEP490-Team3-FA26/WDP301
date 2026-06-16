import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user-service.service';
import { BranchService } from './branch.service';

@Controller()
export class UserServiceController {
  constructor(
    private readonly userService: UserService,
    private readonly branchService: BranchService,
  ) {}

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
}

