import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload, ClientKafka } from '@nestjs/microservices';
import { QuotaService } from './quota.service';
import { subscribeToKafkaTopics } from '../../../api-gateway/src/common/kafka.helper';

@Controller()
export class QuotaController implements OnModuleInit {
  constructor(
    private readonly quotaService: QuotaService,
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.userClient, ['user.branch.list']);
  }



  @EventPattern('quota.event.create')
  async handleQuotaCreate(@Payload() data: string) {
    const dto = JSON.parse(data);
    await this.quotaService.create(dto);
    console.log('✅ [Microservice] Đã tạo thành công Quota mới!');
  }

  @EventPattern('quota.event.update')
  async handleQuotaUpdate(@Payload() payload: string) {
    const { id, data } = JSON.parse(payload);
    await this.quotaService.update(id, data);
    console.log(`✅ [Microservice] Đã cập nhật thành công Quota ${id}!`);
  }

  @EventPattern('quota.event.delete')
  async handleQuotaDelete(@Payload() id: string) {
    await this.quotaService.delete(id);
    console.log(`✅ [Microservice] Đã xóa thành công Quota ${id}!`);
  }

  @MessagePattern('quota.get.by.id')
  async getQuotaById(@Payload() id: string) {
    return this.quotaService.findById(id);
  }

  @MessagePattern('quota.get.by.branch')
  async getQuotaByBranch(@Payload() branchId: string) {
    return this.quotaService.findByBranch(branchId);
  }

  @MessagePattern('quota.get.summary')
  async getQuotaSummary(@Payload() queryPayload: string) {
    const query = queryPayload ? JSON.parse(queryPayload) : {};
    return this.quotaService.getSummary(query);
  }

  @MessagePattern('quota.get.all')
  async getAllQuotas(@Payload() queryPayload: string) {
    const query = queryPayload ? JSON.parse(queryPayload) : {};
    return this.quotaService.findAll(query);
  }
}

