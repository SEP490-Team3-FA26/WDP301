import { Controller, Get, Post, Param, Inject, OnModuleInit, UseInterceptors, UploadedFile, UploadedFiles, Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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

  @Post('scan-ai')
  @UseInterceptors(FilesInterceptor('images', 5))
  async scanPrescriptionImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('branch_id') branchId?: string,
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('Vui lòng cung cấp ít nhất 1 ảnh đơn thuốc', HttpStatus.BAD_REQUEST);
    }

    try {
      const formData = new FormData();
      for (const file of files) {
        const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'image/jpeg' });
        formData.append('files', blob, file.originalname || 'prescription.jpg');
      }
      formData.append('branch_id', branchId || 'CENTRAL_WH');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for multi-page vision

      const aiServiceHost = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
      const response = await fetch(`${aiServiceHost}/api/ai/scan-prescription-v2`, {
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
        error.message || 'Lỗi kết nối hoặc xử lý quét đơn thuốc từ AI Service',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

  @Post('symptom-consult')
  async textConsult(@Body('symptoms') symptoms: string) {
    if (!symptoms) {
      throw new HttpException('Vui lòng cung cấp triệu chứng', HttpStatus.BAD_REQUEST);
    }
    try {
      const response = await fetch('http://ai-service:8000/api/ai/symptom-consult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symptoms }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(`Lỗi từ AI Service: ${errorText}`, HttpStatus.BAD_GATEWAY);
      }

      return await response.json();
    } catch (error) {
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

