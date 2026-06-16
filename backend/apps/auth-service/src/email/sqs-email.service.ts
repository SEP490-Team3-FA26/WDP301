import { Injectable, Logger } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

/**
 * Một "email job" đẩy vào SQS. Lambda (email-sender) sẽ consume và gửi qua SES.
 * Cấu trúc phải khớp với handler ở infra/lambda/email-sender/index.js.
 */
export interface EmailJob {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Thay cho việc gửi SMTP trực tiếp: chỉ đẩy job vào SQS rồi trả về ngay.
 * Việc gửi mail thật do Lambda + SES lo (tách khỏi request, retry/DLQ tự động).
 *
 * Credentials AWS lấy tự động từ IAM instance role của EC2 (không cần access key).
 */
@Injectable()
export class SqsEmailService {
  private readonly logger = new Logger(SqsEmailService.name);
  private readonly sqs = new SQSClient({
    region: process.env.AWS_REGION || 'ap-southeast-1',
  });
  private readonly queueUrl = process.env.SQS_EMAIL_QUEUE_URL;
  private readonly defaultFrom = process.env.SES_FROM_EMAIL;

  /** Có cấu hình SQS hay chưa (dev local thường chưa có → fallback mock). */
  get isEnabled(): boolean {
    return !!this.queueUrl;
  }

  async sendEmail(job: EmailJob): Promise<void> {
    if (!this.queueUrl) {
      this.logger.warn(
        `SQS_EMAIL_QUEUE_URL chưa cấu hình — bỏ qua gửi mail tới ${JSON.stringify(job.to)}`,
      );
      return;
    }

    const body: EmailJob = { from: this.defaultFrom, ...job };

    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(body),
      }),
    );
    this.logger.log(
      `Đã enqueue email tới ${Array.isArray(job.to) ? job.to.join(', ') : job.to}`,
    );
  }
}
