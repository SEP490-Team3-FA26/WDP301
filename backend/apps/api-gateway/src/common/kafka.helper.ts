import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Kafka } from 'kafkajs';

//File này chứa các hàm tiện ích để xử lý việc đăng ký Kafka Topic, tự động khởi tạo Topic và gửi Message/Bắt lỗi chuẩn.

/**
 * Tự động tạo trước các Kafka Topic (và topic .reply tương ứng) trên Kafka Broker nếu chưa tồn tại.
 * Giúp tránh lỗi UNKNOWN_TOPIC_OR_PARTITION khi ClientKafka kết nối.
 */
export async function ensureKafkaTopicsExist(topics: string[]) {
  if (!topics || topics.length === 0) return;
  try {
    const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
    const kafka = new Kafka({
      clientId: 'kafka-topic-admin',
      brokers,
      retry: { initialRetryTime: 500, retries: 5 },
      logLevel: 0,
    });
    const admin = kafka.admin();
    await admin.connect();

    const topicsToCreate = [];
    for (const t of topics) {
      topicsToCreate.push({ topic: t }, { topic: `${t}.reply` });
    }

    await admin.createTopics({
      topics: topicsToCreate,
      waitForLeaders: true,
    });

    await admin.disconnect();
  } catch (err: any) {
    console.warn(`[subscribeToKafkaTopics] Warning ensuring topics exist via Kafka Admin: ${err.message}`);
  }
}

const subscribedReplyTopics = new Set<string>();

function getReplyPattern(client: ClientKafka, topic: string): string {
  if (typeof (client as any).getResponsePatternName === 'function') {
    return (client as any).getResponsePatternName(topic);
  }
  return `${topic}.reply`;
}

/**
 * Connects the ClientKafka instance with retry logic if not already connected.
 * Should be called once after all topics have been pre-subscribed via subscribeToKafkaTopics.
 */
export async function connectKafkaClient(client: ClientKafka, retries = 20, delay = 3000) {
  const rawClient = client as any;
  if (rawClient.client) {
    return;
  }

  for (let i = 0; i < retries; i++) {
    try {
      await client.connect();
      return;
    } catch (error: any) {
      const isLastAttempt = i === retries - 1;
      if (isLastAttempt) {
        console.error(`❌ Kafka client failed to connect after ${retries} attempts.`, error);
        throw error;
      }
      try {
        await client.close();
      } catch (e) {}
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Subscribes to an array of topics for a Kafka client.
 * Registers topics into ClientKafka responsePatterns before connect() is called.
 * @param client The ClientKafka instance
 * @param topics Array of topic names
 */
export async function subscribeToKafkaTopics(client: ClientKafka, topics: string[], retries = 20, delay = 3000) {
  // Đảm bảo topic và reply topic đã tồn tại trên Kafka trước khi Client đăng ký
  await ensureKafkaTopicsExist(topics);

  const rawClient = client as any;

  for (const topic of topics) {
    const replyPattern = getReplyPattern(client, topic);
    try {
      if (!rawClient.client) {
        client.subscribeToResponseOf(topic);
      }
      if (rawClient.responsePatterns && !rawClient.responsePatterns.includes(replyPattern)) {
        rawClient.responsePatterns.push(replyPattern);
      }
      if (rawClient.consumerAssignments && rawClient.consumerAssignments[replyPattern] === undefined) {
        rawClient.consumerAssignments[replyPattern] = 0;
      }
    } catch (e: any) {
      if (rawClient.responsePatterns && !rawClient.responsePatterns.includes(replyPattern)) {
        rawClient.responsePatterns.push(replyPattern);
      }
      if (rawClient.consumerAssignments && rawClient.consumerAssignments[replyPattern] === undefined) {
        rawClient.consumerAssignments[replyPattern] = 0;
      }
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
    const rawClient = client as any;
    const replyPattern = getReplyPattern(client, topic);

    if (rawClient && Array.isArray(rawClient.responsePatterns)) {
      if (!rawClient.responsePatterns.includes(replyPattern)) {
        rawClient.responsePatterns.push(replyPattern);
      }
    }

    if (rawClient && rawClient.consumerAssignments) {
      if (rawClient.consumerAssignments[replyPattern] === undefined) {
        rawClient.consumerAssignments[replyPattern] = 0;
      }
    }

    console.log(`[API-Gateway][sendKafkaMessage] Diagnostics - topic: "${topic}", client patterns:`, rawClient?.responsePatterns, 'assignments:', Object.keys(rawClient?.consumerAssignments || {}));

    const payload = (data && typeof data === 'object') ? JSON.parse(JSON.stringify(data)) : data;
    console.log(`[API-Gateway][sendKafkaMessage] Sending to topic "${topic}"`);
    const result: any = await lastValueFrom(
      client.send(topic, payload).pipe(
        require('rxjs').timeout(30000),
        require('rxjs').retry(1)
      )
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
