import { Module } from '@nestjs/common';
import { TablesController, PublicTablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { QrService } from './qr.service';

@Module({
  controllers: [TablesController, PublicTablesController],
  providers: [TablesService, QrService],
  exports: [TablesService, QrService],
})
export class TablesModule {}
