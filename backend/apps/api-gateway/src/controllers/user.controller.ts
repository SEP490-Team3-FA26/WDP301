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
  Query,
  Res,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ClientKafka, EventPattern, Payload } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

@ApiTags('👤 User Profile')
@Controller('api/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController implements OnModuleInit {
  private readonly auditSubject = new Subject<any>();

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
      'user.audit.list',
      'user.audit.export',
      'user.audit.export_status',
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

  // --- AUDIT LOG ENDPOINTS ---

  @Get('audit-logs')
  @ApiOperation({ summary: 'Truy vấn danh sách Audit Log (Phân quyền theo Scope)' })
  async getAuditLogs(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('module') moduleFilter?: string,
    @Query('eventType') eventType?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('afterEventId') afterEventId?: string,
  ) {
    const user = req.user;
    let allowedModules = moduleFilter;

    // Scope-based RBAC check
    if (user.role === 'admin' || user.role === 'head_branch') {
      // Allowed to view all, no restrictions
    } else if (user.role === 'warehouse') {
      // Restricted to Inventory and Purchase modules
      allowedModules = 'Inventory,Purchase';
    } else {
      throw new HttpException('Bạn không có quyền truy cập nhật ký hệ thống', HttpStatus.FORBIDDEN);
    }

    return await sendKafkaMessage(this.kafkaClient, 'user.audit.list', {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      search: search || '',
      role: role || '',
      module: allowedModules || '',
      eventType: eventType || '',
      severity: severity || '',
      status: status || '',
      afterEventId: afterEventId || '',
    });
  }

  @Post('audit-logs/export')
  @ApiOperation({ summary: 'Yêu cầu tải xuất Audit Logs dạng nền (.csv.gz)' })
  async exportAuditLogs(
    @Request() req,
    @Body() filter: { search?: string; role?: string; module?: string; eventType?: string; severity?: string; status?: string }
  ) {
    const user = req.user;
    let allowedModules = filter.module;

    if (user.role === 'admin' || user.role === 'head_branch') {
      // Allowed
    } else if (user.role === 'warehouse') {
      allowedModules = 'Inventory,Purchase';
    } else {
      throw new HttpException('Bạn không có quyền xuất nhật ký hệ thống', HttpStatus.FORBIDDEN);
    }

    return await sendKafkaMessage(this.kafkaClient, 'user.audit.export', {
      search: filter.search || '',
      role: filter.role || '',
      module: allowedModules || '',
      eventType: filter.eventType || '',
      severity: filter.severity || '',
      status: filter.status || '',
    });
  }

  @Get('audit-logs/export-status/:jobId')
  @ApiOperation({ summary: 'Kiểm tra trạng thái tiến trình xuất file' })
  async getExportStatus(@Param('jobId') jobId: string) {
    return await sendKafkaMessage(this.kafkaClient, 'user.audit.export_status', { jobId });
  }

  @Get('audit-logs/download/:filename')
  @ApiOperation({ summary: 'Tải xuống tệp Audit Log nén Gzip' })
  async downloadAuditLog(@Param('filename') filename: string, @Res() res) {
    const tempDir = path.resolve(process.cwd(), 'temp');
    const filePath = path.join(tempDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new HttpException('Tệp không tồn tại hoặc đã hết hạn', HttpStatus.NOT_FOUND);
    }

    res.setHeader('Content-Type', 'application/x-gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Sse('audit-logs/stream')
  @ApiOperation({ summary: 'Kênh truyền dữ liệu nhật ký hệ thống thời gian thực (HTTP Streaming)' })
  auditLogStream(@Request() req): Observable<MessageEvent> {
    const user = req.user;

    // Check scope-based permissions
    if (user.role !== 'admin' && user.role !== 'head_branch' && user.role !== 'warehouse') {
      throw new HttpException('Bạn không có quyền truy cập nhật ký hệ thống', HttpStatus.FORBIDDEN);
    }

    return this.auditSubject.asObservable().pipe(
      filter((log) => {
        // Scope-based Permission Filter
        if (user.role === 'admin' || user.role === 'head_branch') {
          return true;
        }
        if (user.role === 'warehouse') {
          // Warehouse can only view Inventory and Purchase modules
          return log.module === 'Inventory' || log.module === 'Purchase';
        }
        return false;
      }),
      map((log) => ({
        data: log,
      } as MessageEvent)),
    );
  }

  @EventPattern('audit.persisted')
  handleAuditPersisted(@Payload() logs: any[]) {
    if (Array.isArray(logs)) {
      for (const log of logs) {
        this.auditSubject.next(log);
      }
    } else if (logs) {
      this.auditSubject.next(logs);
    }
  }
}

