import { Global, Module } from '@nestjs/common';
import { AppLogger } from './logger';
import { MetricsService } from './metrics';
import { MetricsController } from './metrics.controller';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [AppLogger, MetricsService, EmailService],
  controllers: [MetricsController],
  exports: [AppLogger, MetricsService, EmailService],
})
export class InfrastructureModule {}
