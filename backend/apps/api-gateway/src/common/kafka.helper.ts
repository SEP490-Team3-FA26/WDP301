import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';



//File này chứa 2 hàm gọn nhẹ để xử lý việc đăng ký Kafka Topic và gửi Message/Bắt lỗi chuẩn.

/**
 * Subscribes to an array of topics and connects the Kafka client.
 * @param client The ClientKafka instance
 * @param topics Array of topic names
 */
export async function subscribeToKafkaTopics(client: ClientKafka, topics: string[], retries = 20, delay = 3000) {
  for (const topic of topics) {
    try {
      client.subscribeToResponseOf(topic);
    } catch (e: any) {
      // Ignore if topic response subscription already registered or client connected
    }
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
        throw error;
      }
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
    const payload = (data && typeof data === 'object') ? JSON.parse(JSON.stringify(data)) : data;
    console.log(`[API-Gateway][sendKafkaMessage] Sending to topic "${topic}"`);
    const result: any = await lastValueFrom(
      client.send(topic, payload).pipe(timeout(30000))
    );
    console.log(`[API-Gateway][sendKafkaMessage] Received response from topic "${topic}"`);
    if (result?.error) {
      throw new HttpException(result.message || 'Internal Microservice Error', result.statusCode || 500);
    }
    return result;
  } catch (err: any) {
    if (err instanceof HttpException) {
      if (err.getStatus() < 500) {
        console.warn(`[API-Gateway][sendKafkaMessage] Validation warning on topic "${topic}": ${err.message} (${err.getStatus()})`);
      } else {
        console.error(`[API-Gateway][sendKafkaMessage] Server error on topic "${topic}": ${err.message}`, err.stack);
      }
      throw err;
    }

    console.error(`[API-Gateway][sendKafkaMessage] Exception on topic "${topic}":`, err?.message || err);

    if (err?.name === 'TimeoutError') {
      throw new HttpException(`Microservice timeout on topic "${topic}"`, HttpStatus.GATEWAY_TIMEOUT);
    }

    let message = 'Lỗi hệ thống từ microservice';
    let statusCode = 500;

    try {
      if (typeof err?.message === 'string' && err.message.trim().startsWith('{')) {
        const parsed = JSON.parse(err.message);
        message = parsed?.message || message;
        statusCode = parsed?.statusCode || 500;
      } else if (typeof err?.message === 'string' && err.message.length > 0) {
        message = err.message;
        statusCode = err?.statusCode || 500;
      } else if (err?.error && typeof err.error === 'string') {
        message = err.error;
        statusCode = 500;
      }
    } catch {
      message = err?.message || message;
      statusCode = 500;
    }

    throw new HttpException(message, statusCode);
  }
}
