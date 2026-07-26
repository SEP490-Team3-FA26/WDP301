import { Controller, Get, Post, Query, Body, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@ApiTags('💰 Finance & Cash Flow')
@Controller('api/finance')
export class FinanceController implements OnModuleInit {
  constructor(
    @Inject('ORDER_SERVICE') private readonly ordersClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.ordersClient, [
      'finance.expense.create',
      'finance.expense.list',
      'finance.cashflow.summary',
    ]);
  }

  @Post('expenses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'head_branch')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ghi nhận chi phí cố định (Mặt bằng, Lương, Điện nước...)' })
  @AuditLogAction({
    actionCode: 'FINANCE_EXPENSE_CREATE',
    actionName: 'Ghi nhận chi phí cố định',
    module: 'Finance',
    eventType: 'CREATE',
    entityType: 'Expense',
  })
  async createExpense(@Body() body: any) {
    return await sendKafkaMessage(this.ordersClient, 'finance.expense.create', body);
  }

  @Get('expenses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách chi phí cố định' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: String })
  async getExpenses(
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
    @Query('year') year?: string,
  ) {
    return await sendKafkaMessage(this.ordersClient, 'finance.expense.list', { branchId, category, year });
  }

  @Get('cashflow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tổng hợp báo cáo dòng tiền & Lợi nhuận ròng toàn hệ thống/chi nhánh' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'year', required: false, type: String })
  async getCashFlowSummary(
    @Query('branchId') branchId?: string,
    @Query('year') year?: string,
  ) {
    return await sendKafkaMessage(this.ordersClient, 'finance.cashflow.summary', { branchId, year });
  }
}
