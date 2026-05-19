import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/wdp301',
        connectionFactory: (connection) => {
          console.log('✅ MongoDB connected');
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    TerminusModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
