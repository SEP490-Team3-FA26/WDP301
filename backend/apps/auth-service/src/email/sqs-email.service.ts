import { Injectable, Logger } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import * as nodemailer from 'nodemailer';

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
 * Fallback: Dùng Gmail SMTP nếu chưa cấu hình SQS_EMAIL_QUEUE_URL.
 */
@Injectable()
export class SqsEmailService {
  private readonly logger = new Logger(SqsEmailService.name);
  private readonly sqs = new SQSClient({
    region: process.env.AWS_REGION || 'ap-southeast-1',
  });
  private readonly queueUrl = process.env.SQS_EMAIL_QUEUE_URL;
  private readonly defaultFrom = process.env.SES_FROM_EMAIL;

  private readonly transporter = process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for port 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

  /** Có cấu hình SQS hoặc SMTP hay chưa. */
  get isEnabled(): boolean {
    return !!this.queueUrl || !!this.transporter;
  }

  async sendEmail(job: EmailJob): Promise<void> {
    if (this.queueUrl) {
      const body: EmailJob = { from: this.defaultFrom, ...job };

      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(body),
        }),
      );
      this.logger.log(
        `Đã enqueue email tới ${Array.isArray(job.to) ? job.to.join(', ') : job.to} qua SQS`,
      );
    } else if (this.transporter) {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: Array.isArray(job.to) ? job.to.join(', ') : job.to,
        subject: job.subject,
        html: job.html,
        text: job.text,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Đã gửi email trực tiếp tới ${mailOptions.to} qua Gmail SMTP (Fallback)`,
      );
    } else {
      this.logger.warn(
        `Chưa cấu hình SQS hoặc Gmail SMTP — bỏ qua gửi mail tới ${JSON.stringify(job.to)}`,
      );
    }
  }
}
