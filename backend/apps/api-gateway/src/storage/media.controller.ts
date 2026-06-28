import {
  Controller,
  Post,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { S3StorageService } from '../storage/s3-storage.service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

@ApiTags('📦 Media (S3)')
@Controller('api/media')
export class MediaController {
  constructor(private readonly storage: S3StorageService) {}

  /** Upload 1 ảnh lên S3, trả về { key, url } (url là presigned, hết hạn sau 1h). */
  @Post('images')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Thiếu file ảnh (field "image")');
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh JPEG/PNG/WebP/GIF');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Ảnh vượt quá 5MB');
    }

    const { key } = await this.storage.uploadImage(file);
    const url = await this.storage.getPresignedUrl(key);
    return { key, url };
  }

  /** Lấy lại presigned URL cho 1 object key (key truyền qua query để chứa được dấu "/"). */
  @Get('images/url')
  async getUrl(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('Thiếu query param "key"');
    }
    const url = await this.storage.getPresignedUrl(key);
    return { key, url };
  }
}
