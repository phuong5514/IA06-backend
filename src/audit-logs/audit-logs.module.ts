import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogInterceptor } from './audit-log.interceptor';

@Module({
  providers: [AuditLogsService, AuditLogInterceptor],
  controllers: [AuditLogsController],
  exports: [AuditLogsService, AuditLogInterceptor],
})
export class AuditLogsModule {}
