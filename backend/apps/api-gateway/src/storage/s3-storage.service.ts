import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * Lưu trữ ảnh trên S3 (thay cho Supabase/Cloudinary).
 *
 * Bucket private (block public access) → trả về presigned URL có hạn để client
 * xem ảnh. Credentials AWS lấy tự động từ IAM instance role của EC2.
 */
@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-1',
  });
  private readonly bucket = process.env.S3_IMAGES_BUCKET;

  private ensureBucket(): string {
    if (!this.bucket) {
      throw new InternalServerErrorException('S3_IMAGES_BUCKET chưa được cấu hình');
    }
    return this.bucket;
  }

  /** Upload 1 ảnh, trả về object key (dùng key để lấy presigned URL khi cần). */
  async uploadImage(
    file: Express.Multer.File,
    prefix = 'images',
  ): Promise<{ key: string }> {
    const bucket = this.ensureBucket();
    const ext = (file.originalname?.split('.').pop() || 'bin').toLowerCase();
    const datePath = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `${prefix}/${datePath}/${randomUUID()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    this.logger.log(`Uploaded s3://${bucket}/${key} (${file.size} bytes)`);
    return { key };
  }

  /** Tạo URL có chữ ký để xem ảnh, mặc định hết hạn sau 1 giờ. */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const bucket = this.ensureBucket();
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn },
    );
  }

  async deleteObject(key: string): Promise<void> {
    const bucket = this.ensureBucket();
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    this.logger.log(`Deleted s3://${bucket}/${key}`);
  }
}
