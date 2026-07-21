import { Controller, Get, Post, Put, Delete, Body, Param, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@ApiTags('🏢 Branches')
@Controller('api/branches')
@UseGuards(JwtAuthGuard)
export class BranchController implements OnModuleInit {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.userClient, [
      'user.branch.list',
      'user.branch.create',
      'user.branch.update',
      'user.branch.delete',
    ]);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả chi nhánh' })
  async getAllBranches() {
    return await sendKafkaMessage(this.userClient, 'user.branch.list', {});
  }

  @Post()
  @ApiOperation({ summary: 'Tạo chi nhánh mới' })
  @AuditLogAction({
    actionCode: 'BRANCH_CREATE',
    actionName: 'Tạo chi nhánh mới',
    module: 'Branch',
    eventType: 'CREATE',
    entityType: 'Branch',
  })
  async createBranch(@Body() data: any) {
    return await sendKafkaMessage(this.userClient, 'user.branch.create', data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin chi nhánh' })
  @AuditLogAction({
    actionCode: 'BRANCH_UPDATE',
    actionName: 'Cập nhật thông tin chi nhánh',
    module: 'Branch',
    eventType: 'UPDATE',
    entityType: 'Branch',
  })
  async updateBranch(@Param('id') id: string, @Body() data: any) {
    return await sendKafkaMessage(this.userClient, 'user.branch.update', { id, updateData: data });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa chi nhánh' })
  @AuditLogAction({
    actionCode: 'BRANCH_DELETE',
    actionName: 'Xóa chi nhánh',
    module: 'Branch',
    eventType: 'DELETE',
    entityType: 'Branch',
  })
  async deleteBranch(@Param('id') id: string) {
    return await sendKafkaMessage(this.userClient, 'user.branch.delete', { id });
  }
}
