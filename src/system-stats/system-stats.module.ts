import { Module } from '@nestjs/common';
import { SystemStatsService } from './system-stats.service';
import { SystemStatsController } from './system-stats.controller';

@Module({
  providers: [SystemStatsService],
  controllers: [SystemStatsController],
  exports: [SystemStatsService],
})
export class SystemStatsModule {}
