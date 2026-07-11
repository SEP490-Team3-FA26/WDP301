import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { QuotaService } from './quota.service';

@Controller()
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

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

  @MessagePattern('quota.get.all')
  async getAllQuotas(@Payload() queryPayload: string) {
    const query = queryPayload ? JSON.parse(queryPayload) : {};
    return this.quotaService.findAll(query);
  }
}
