import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService, UserService } from './app.service';
import { AuditLogInterceptor } from './audit-logs/audit-log.interceptor';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { UsersModule } from './users/users.module';
import { TablesModule } from './tables/tables.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { MenuModule } from './menu/menu.module';
import { UserModule } from './user/user.module';
import { OrdersModule } from './orders/orders.module';
import { WebsocketModule } from './websocket/websocket.module';
import { PaymentsModule } from './payments/payments.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { SystemStatsModule } from './system-stats/system-stats.module';

@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    UsersModule,
    TablesModule,
    MenuModule,
    UserModule,
    OrdersModule,
    WebsocketModule,
    PaymentsModule,
    AuditLogsModule,
    SystemSettingsModule,
    SystemStatsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
