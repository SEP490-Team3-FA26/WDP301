import { Controller, Get, Post, Put, Delete, Body, Param, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('🏢 Branches')
@Controller('api/branches')
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
  async createBranch(@Body() data: any) {
    return await sendKafkaMessage(this.userClient, 'user.branch.create', data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin chi nhánh' })
  async updateBranch(@Param('id') id: string, @Body() data: any) {
    return await sendKafkaMessage(this.userClient, 'user.branch.update', { id, updateData: data });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa chi nhánh' })
  async deleteBranch(@Param('id') id: string) {
    return await sendKafkaMessage(this.userClient, 'user.branch.delete', { id });
  }
}
