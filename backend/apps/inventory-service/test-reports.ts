import { NestFactory } from '@nestjs/core';
import { InventoryServiceModule } from './src/inventory-service.module';
import { ReportsService } from './src/reports/reports.service';

async function run() {
  const app = await NestFactory.createApplicationContext(InventoryServiceModule);
  const reportsService = app.get(ReportsService);
  
  console.log('Testing getForecastDataset...');
  const start = Date.now();
  try {
    const result = await reportsService.getForecastDataset(30, undefined);
    console.log(`Success in ${Date.now() - start}ms. Result length: ${result?.length}`);
  } catch (err) {
    console.error(`Failed in ${Date.now() - start}ms:`, err);
  }
  await app.close();
}
run();
