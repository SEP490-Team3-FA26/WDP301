import { Controller, Get, Post, Param, Inject, OnModuleInit, UseInterceptors, UploadedFile, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/prescriptions')
@UseGuards(JwtAuthGuard)
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

  @Post('recommend')
  @UseInterceptors(FileInterceptor('audio'))
  async recommendPrescription(
    @UploadedFile() file: Express.Multer.File,
    @Body('patient_id') patientId?: string,
  ) {
    if (!file) {
      throw new HttpException('Vui lòng cung cấp file ghi âm cuộc thoại', HttpStatus.BAD_REQUEST);
    }

    try {
      const formData = new FormData();
      
      // Convert Buffer to Blob for fetch FormData
      const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'audio/webm' });
      formData.append('audio', blob, file.originalname || 'audio.webm');
      
      if (patientId) {
        formData.append('patient_id', patientId);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch('http://ai-service:8000/api/prescription', {
        method: 'POST',
        headers: {
          'X-Internal-Token': process.env.JWT_SECRET || 'wdp301-super-secret-key-change-in-production',
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(`Lỗi từ AI Service: ${errorText}`, response.status);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Lỗi kết nối hoặc xử lý từ AI Service',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
