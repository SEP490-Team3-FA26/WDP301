const { Kafka } = require('kafkajs');
async function test() {
  const kafka = new Kafka({ clientId: 'test', brokers: ['localhost:9092'] });
  const producer = kafka.producer();
  await producer.connect();
  const replyTopic = 'test.reply.' + Date.now();
  const consumer = kafka.consumer({ groupId: 'test-group-' + Date.now() });
  await consumer.connect();
  await consumer.subscribe({ topic: replyTopic });
  consumer.run({
    eachMessage: async ({ message }) => {
      console.log('REPLY:', message.value.toString());
      process.exit(0);
    }
  });
  console.log('Sending message...');
  await producer.send({
    topic: 'inventory.medicine.safe_stock_chain',
    messages: [{
      value: JSON.stringify({ serviceLevel: 0.95, periodDays: 30, page: 1, limit: 20 }),
      headers: { kafka_replyTopic: replyTopic, kafka_correlationId: '123' }
    }]
  });
}
test();
