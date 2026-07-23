import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
  OnModuleInit,
  Query,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@ApiTags('🛡️ Admin & Branch Employee Management')
@Controller('api/admin/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'branch')
@ApiBearerAuth()
export class AdminEmployeeController implements OnModuleInit {
  constructor(@Inject('USER_SERVICE') private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'user.admin.employee.create',
      'user.admin.employee.list',
      'user.admin.employee.get',
      'user.admin.employee.update',
      'user.admin.employee.ban_unban',
      'user.admin.employee.delete',
      'user.admin.employee.approve',
    ]);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhân viên' })
  async listEmployees(@Query() query: any) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.list', query || {});
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết nhân viên' })
  async getEmployee(@Param('id') id: string) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.get', { id });
  }

  @Post()
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên mới' })
  async createEmployee(@Body() data: any) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.create', data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin nhân viên' })
  async updateEmployee(@Param('id') id: string, @Body() data: any) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.update', { id, ...data });
  }

  @Put(':id/ban')
  @ApiOperation({ summary: 'Ban / Unban nhân viên' })
  async toggleBanEmployee(@Param('id') id: string) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.ban_unban', { id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài khoản nhân viên' })
  async deleteEmployee(@Param('id') id: string) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.delete', { id });
  }

  @Put(':id/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Phê duyệt / Từ chối tài khoản nhân viên (chỉ Admin)' })
  async approveEmployee(@Param('id') id: string, @Body() body: { action: 'approve' | 'reject' }) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.approve', { id, action: body.action });
  }
}
