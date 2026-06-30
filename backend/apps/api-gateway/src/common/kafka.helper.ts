import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { HttpException } from '@nestjs/common';



//File này chứa 2 hàm gọn nhẹ để xử lý việc đăng ký Kafka Topic và gửi Message/Bắt lỗi chuẩn.

/**
 * Subscribes to an array of topics and connects the Kafka client.
 * @param client The ClientKafka instance
 * @param topics Array of topic names
 */
export async function subscribeToKafkaTopics(client: ClientKafka, topics: string[], retries = 20, delay = 3000) {
  for (const topic of topics) {
    client.subscribeToResponseOf(topic);
  }
  for (let i = 0; i < retries; i++) {
    try {
      await client.connect();
      return;
    } catch (error: any) {
      const isRetriable = error?.retriable === true || error?.type === 'UNKNOWN_TOPIC_OR_PARTITION';
      const isLastAttempt = i === retries - 1;
      if (isLastAttempt) {
        console.error(`❌ Kafka client failed to connect to topics: ${topics.join(', ')} after ${retries} attempts.`, error);
        try { await client.close(); } catch(e) {}
        throw error;
      }
      // Xoá cache connection cũ để NestJS ClientKafka thử kết nối lại thực sự từ đầu
      try { await client.close(); } catch(e) {}
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
    console.log(`[API-Gateway][sendKafkaMessage] Sending to topic "${topic}" with data: ${JSON.stringify(data)}`);
    const result: any = await lastValueFrom(
      client.send(topic, data).pipe(timeout(15000))
    );
    console.log(`[API-Gateway][sendKafkaMessage] Received response from topic "${topic}": ${JSON.stringify(result)}`);
    // Trường hợp microservice trả về object lỗi thông thường (không phải throw)
    if (result?.error) {
      console.warn(`[API-Gateway][sendKafkaMessage] Microservice returned error object: ${JSON.stringify(result)}`);
      throw new HttpException(result.message || 'Internal Microservice Error', result.statusCode || 400);
    }
    return result;
  } catch (err: any) {
    console.error(`[API-Gateway][sendKafkaMessage] Error on topic "${topic}": ${err.message}`, err.stack);
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
