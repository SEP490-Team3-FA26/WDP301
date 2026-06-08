import { Controller, Get, Param, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from './common/kafka.helper';

@Controller('api/prescriptions')
export class PrescriptionController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.prescription.get',
      'inventory.prescription.list',
    ]);
  }

  @Get()
  async listPrescriptions() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.prescription.list', {});
  }

  @Get(':code')
  async getPrescriptionByCode(@Param('code') code: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.prescription.get', { code });
  }
}
