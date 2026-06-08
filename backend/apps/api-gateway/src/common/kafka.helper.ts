import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { HttpException } from '@nestjs/common';



//File này chứa 2 hàm gọn nhẹ để xử lý việc đăng ký Kafka Topic và gửi Message/Bắt lỗi chuẩn.

/**
 * Subscribes to an array of topics and connects the Kafka client.
 * @param client The ClientKafka instance
 * @param topics Array of topic names
 */
export async function subscribeToKafkaTopics(client: ClientKafka, topics: string[], retries = 5, delay = 3000) {
  for (const topic of topics) {
    client.subscribeToResponseOf(topic);
  }
  for (let i = 0; i < retries; i++) {
    try {
      await client.connect();
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`⚠️ Kafka client failed to connect/subscribe to: ${topics.join(', ')}. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Sends a message via Kafka and standardizes the error handling.
 * Throws a standard NestJS HttpException if the microservice returns an error payload.
 * @param client The ClientKafka instance
 * @param topic The topic to send to
 * @param data The payload data
 * @returns The successful response payload
 */
export async function sendKafkaMessage(client: ClientKafka, topic: string, data: any) {
  try {
    const result: any = await lastValueFrom(client.send(topic, data));
    // Trường hợp microservice trả về object lỗi thông thường (không phải throw)
    if (result?.error) {
      throw new HttpException(result.message || 'Internal Microservice Error', result.statusCode || 400);
    }
    return result;
  } catch (err: any) {
    // Trường hợp microservice throw RpcException → NestJS Kafka đẩy thành Observable error
    // err.message có thể là JSON string hoặc plain string
    if (err instanceof HttpException) throw err; // Đã được xử lý ở trên

    let message = 'Lỗi hệ thống từ microservice';
    let statusCode = 500;

    try {
      // RpcException message thường là JSON: { message, statusCode } hoặc plain string
      const parsed = typeof err.message === 'string' ? JSON.parse(err.message) : err.message;
      message = parsed?.message || parsed || err.message;
      statusCode = parsed?.statusCode || 400;
    } catch {
      message = err.message || message;
    }

    throw new HttpException(message, statusCode);
  }
}
