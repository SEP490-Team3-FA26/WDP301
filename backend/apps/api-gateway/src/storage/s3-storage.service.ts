import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
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
    try {
      const fs = require('fs');
      const path = require('path');
      const localPath = path.join(process.cwd(), 'public', key);
      if (fs.existsSync(localPath)) {
        return `http://localhost:4000/public/${key}`;
      }
    } catch (e) {
      // ignore
    }

    const bucket = this.ensureBucket();
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn },
    );
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType = 'application/pdf',
  ): Promise<{ key: string }> {
    try {
      const bucket = this.ensureBucket();
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
      this.logger.log(`Uploaded s3://${bucket}/${key} (${buffer.length} bytes)`);
    } catch (err: any) {
      if (
        err.message?.includes('credentials') || 
        err.message?.includes('Credentials') || 
        err.name?.includes('Credentials')
      ) {
        this.logger.warn(`AWS Credentials not loaded. Falling back to local filesystem storage for key: ${key}`);
        const fs = require('fs');
        const path = require('path');
        const localPath = path.join(process.cwd(), 'public', key);
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, buffer);
        this.logger.log(`Successfully saved fallback local file to: ${localPath}`);
      } else {
        throw err;
      }
    }
    return { key };
  }

  async listReports(branchId: string, type?: string): Promise<any[]> {
    try {
      const bucket = this.ensureBucket();
      // Nếu branchId là all hoặc chưa có, lấy hết trong reports/revenue/
      // Nếu có branchId cụ thể, lấy theo prefix của branch đó
      const prefix = !branchId || branchId === 'all' ? 'reports/revenue/' : `reports/revenue/${branchId}/`;
      
      const response = await this.s3.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      }));

      if (!response.Contents) return [];

      const reports = await Promise.all(response.Contents.map(async (item) => {
        const key = item.Key!;
        // key format: reports/revenue/[branchId]/[period]_[date]_[uuid].pdf
        const parts = key.split('/');
        const filename = parts.pop()!;
        const reportBranchId = parts.pop()!;
        
        // filename format: month_2026-07-04_uuid.pdf
        const fileParts = filename.replace('.pdf', '').split('_');
        const period = fileParts[0] || 'unknown';
        const dateStr = fileParts[1] || 'unknown';
        const uuidStr = fileParts.slice(2).join('_') || '0000';

        const periodName = period === 'day' ? 'ngày' : period === 'week' ? 'tuần' : period === 'month' ? 'tháng' : period === 'quarter' ? 'quý' : period;
        
        const downloadUrl = await this.getPresignedUrl(key, 86400 * 7);

        return {
          id: `REP-${uuidStr.substring(0, 6).toUpperCase()}`,
          name: `Báo cáo doanh thu ${periodName} - ${reportBranchId}`,
          type: 'Doanh thu',
          format: 'PDF',
          date: item.LastModified ? new Date(item.LastModified).toLocaleDateString('vi-VN') : dateStr,
          size: item.Size ? `${(item.Size / 1024).toFixed(1)} KB` : '0 KB',
          status: 'Hoàn thành',
          author: 'Hệ thống', // Mặc định do S3 không lưu metadata người tạo trong Key
          downloadUrl,
          branchId: reportBranchId,
          lastModified: item.LastModified?.getTime() || 0,
        };
      }));
      
      // Sort newest first
      return reports.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error: any) {
      this.logger.error(`Error listing reports from S3: ${error.message}`);
      return [];
    }
  }

  async deleteObject(key: string): Promise<void> {
    const bucket = this.ensureBucket();
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    this.logger.log(`Deleted s3://${bucket}/${key}`);
  }
}
