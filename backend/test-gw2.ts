import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';

async function bootstrap() {
  const client = new ClientKafka({
    client: { clientId: 'test-gw', brokers: ['kafka:29092'] },
    consumer: { groupId: 'test-gw-group-' + Date.now() },
  });
  
  const topics = [
      'inventory.medicine.list',
      'inventory.medicine.get_by_id',
      'inventory.medicine.update_status',
      'inventory.medicine.update_price_tiers',
      'inventory.medicine.get_filters',
      'inventory.medicine.stats',
      'inventory.medicine.expiration_report',
      'inventory.medicine.handle_expiration_action',
      'inventory.medicine.low_stock_report',
      'inventory.medicine.dropdown_list',
      'inventory.medicine.get_alternatives',
      'inventory.medicine.update_price',
      'inventory.medicine.safe_stock_chain',
      'inventory.medicine.detect_anomalies',
      'inventory.medicine.branch_list',
      'inventory.medicine.create',
      'inventory.medicine.update',
      'inventory.reports.forecast_dataset',
      'inventory.reports.seasonal_trends',
      'inventory.report.create',
      'inventory.report.list',
      'inventory.pr.create',
      'inventory.pr.list',
      'inventory.pr.get_by_id',
      'inventory.pr.process_urgent',
      'inventory.po.approve_pay',
      'inventory.po.auto_route',
      'inventory.po.list',
      'inventory.po.get_by_id',
      'inventory.po.reject_delivery',
      'inventory.grn.create',
      'inventory.grn.list',
      'inventory.grn.get_by_id',
      'inventory.grn.submit_inspection',
      'inventory.grn.approve',
      'inventory.grn.reject',
      'inventory.grn.update',
      'inventory.inspection.create',
      'inventory.inspection.verify_item',
      'inventory.inspection.submit',
      'inventory.inspection.list',
      'inventory.transactions.list',
      'inventory.prescription.get',
      'inventory.prescription.get_by_code',
      'inventory.prescription.list',
      'inventory.sales.create',
      'inventory.sales.list',
      'inventory.sales.get_by_id',
      'inventory.sales.return',
      'inventory.sales.exchange',
      'inventory.transfer.create',
      'inventory.transfer.create_direct',
      'inventory.transfer.recommend',
      'inventory.transfer.receive',
      'inventory.transfer.list',
      'inventory.transfer.get_by_id',
      'inventory.sale.report',
      'quota.get.by.id',
      'quota.get.by.branch',
      'quota.get.summary',
      'quota.get.all',
  ];
  
  for (const t of topics) {
    client.subscribeToResponseOf(t);
  }
  
  await client.connect();
  console.log('Connected! Sending...');
  
  try {
    const res = await lastValueFrom(
      client.send('inventory.reports.forecast_dataset', { periodDays: 30, branchId: 'all' }).pipe(timeout(5000))
    );
    console.log('SUCCESS:', res?.length);
  } catch (err) {
    console.error('ERROR:', err);
  }
  await client.close();
}
bootstrap();
