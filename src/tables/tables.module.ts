import { Module } from '@nestjs/common';
import { TablesController, PublicTablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { QrService } from './qr.service';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [SystemSettingsModule],
  controllers: [TablesController, PublicTablesController],
  providers: [TablesService, QrService],
  exports: [TablesService, QrService],
})
export class TablesModule {}
