import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
  imports: [
    WebsocketModule,
    forwardRef(() => SystemSettingsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
