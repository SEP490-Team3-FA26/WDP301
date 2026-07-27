import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom, timeout, retry } from 'rxjs';

async function bootstrap() {
  const client = new ClientKafka({
    client: { clientId: 'test-gw', brokers: ['kafka:29092'] },
    consumer: { groupId: 'test-gw-group-' + Date.now() },
  });
  
  client.subscribeToResponseOf('inventory.reports.forecast_dataset');
  
  await client.connect();
  console.log('Connected! Sending...');
  
  try {
    const res = await lastValueFrom(
      client.send('inventory.reports.forecast_dataset', { periodDays: 30, branchId: 'all' }).pipe(
        timeout(1), // force timeout
        retry(1)
      )
    );
    console.log('SUCCESS:', res?.length);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
  await client.close();
}
bootstrap();
