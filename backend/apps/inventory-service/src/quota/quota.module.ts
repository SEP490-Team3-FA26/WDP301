import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';
import { Quota, QuotaSchema } from './schemas/quota.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quota.name, schema: QuotaSchema }]),
  ],
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
