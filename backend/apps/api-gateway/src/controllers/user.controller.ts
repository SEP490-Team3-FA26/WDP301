import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Inject,
  OnModuleInit,
  HttpException,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('👤 User Profile')
@Controller('api/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController implements OnModuleInit {
  constructor(@Inject('USER_SERVICE') private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'user.edit_profile',
      'user.change_avatar',
      'user.cart.get',
      'user.cart.add',
      'user.cart.update',
      'user.cart.delete',
      'user.cart.clear',
      'user.loyalty.get',
      'user.loyalty.lookup',
      'user.loyalty.update_points',
    ]);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Chỉnh sửa thông tin hồ sơ' })
  async editProfile(@Request() req, @Body() data: { fullName?: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'user.edit_profile', {
      userId: req.user.sub,
      ...data,
    });
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Cập nhật ảnh đại diện (avatar URL)' })
  async changeAvatar(@Request() req, @Body() data: { avatarUrl: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'user.change_avatar', {
      userId: req.user.sub,
      avatarUrl: data.avatarUrl,
    });
  }

  // --- CART REST ENDPOINTS ---

  @Get('cart')
  @ApiOperation({ summary: 'Lấy thông tin giỏ hàng của user' })
  async getCart(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'user.cart.get', {
      userId: req.user.sub,
    });
  }

  @Post('cart')
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ hàng' })
  async addToCart(@Request() req, @Body() data: { medicineId: string; quantity?: number }) {
    return await sendKafkaMessage(this.kafkaClient, 'user.cart.add', {
      userId: req.user.sub,
      medicineId: data.medicineId,
      quantity: data.quantity || 1,
    });
  }

  @Put('cart/:medicineId')
  @ApiOperation({ summary: 'Cập nhật số lượng của sản phẩm trong giỏ hàng' })
  async updateCartItem(
    @Request() req,
    @Param('medicineId') medicineId: string,
    @Body('quantity') quantity: number
  ) {
    return await sendKafkaMessage(this.kafkaClient, 'user.cart.update', {
      userId: req.user.sub,
      medicineId,
      quantity,
    });
  }

  @Delete('cart/:medicineId')
  @ApiOperation({ summary: 'Xóa sản phẩm khỏi giỏ hàng' })
  async deleteCartItem(@Request() req, @Param('medicineId') medicineId: string) {
    return await sendKafkaMessage(this.kafkaClient, 'user.cart.delete', {
      userId: req.user.sub,
      medicineId,
    });
  }

  @Post('cart/clear')
  @ApiOperation({ summary: 'Dọn sạch giỏ hàng' })
  async clearCart(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'user.cart.clear', {
      userId: req.user.sub,
    });
  }

  @Get('loyalty')
  @ApiOperation({ summary: 'Lấy thông tin tích điểm khách hàng thân thiết' })
  async getLoyalty(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'user.loyalty.get', {
      userId: req.user.sub,
    });
  }

  @Get('loyalty/lookup')
  @ApiOperation({ summary: 'Tra cứu thông tin tích điểm của khách hàng bằng số điện thoại' })
  async lookupLoyalty(@Request() req, @Body('phone') bodyPhone?: string, @Param('phone') paramPhone?: string, @Request() queryReq?: any) {
    // Check both query param and body
    const phone = req.query.phone || bodyPhone || paramPhone;
    return await sendKafkaMessage(this.kafkaClient, 'user.loyalty.lookup', {
      phone,
    });
  }
}

