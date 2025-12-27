import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger';
import { MetricsService } from './metrics';
import { MetricsController } from './metrics.controller';
import { EmailService } from './email.service';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [AppLogger, MetricsService, EmailService, DatabaseService],
  controllers: [MetricsController],
  exports: [AppLogger, MetricsService, EmailService, DatabaseService],
})
export class InfrastructureModule {}
