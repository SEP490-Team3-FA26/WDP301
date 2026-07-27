const { Kafka } = require('kafkajs');
async function test() {
  const kafka = new Kafka({ clientId: 'test', brokers: ['kafka:29092'] });
  const producer = kafka.producer();
  await producer.connect();
  const replyTopic = 'inventory.reports.forecast_dataset.reply';
  const consumer = kafka.consumer({ groupId: 'test-group-' + Date.now(), allowAutoTopicCreation: true });
  await consumer.connect();
  await consumer.subscribe({ topic: replyTopic });
  console.log('Sending message to inventory.reports.forecast_dataset...');
  const startTime = Date.now();
  await producer.send({
    topic: 'inventory.reports.forecast_dataset',
    messages: [{
      value: JSON.stringify({ periodDays: 30 }),
      headers: { kafka_replyTopic: replyTopic, kafka_correlationId: '123' }
    }]
  });
  console.log('Message sent. Waiting for reply...');
  consumer.run({
    eachMessage: async ({ message }) => {
      console.log(`REPLY received in ${Date.now() - startTime}ms:`, message.value.toString().substring(0, 150) + '...');
      process.exit(0);
    }
  });
}
test();
