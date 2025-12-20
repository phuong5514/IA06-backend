import { Module } from '@nestjs/common';
import { AppController} from './app.controller';
import { AppService, UserService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { UsersModule } from './users/users.module';
import { TablesModule } from './tables/tables.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule, AuthModule, UsersModule, TablesModule],
  controllers: [AppController],
  providers: [AppService, UserService],
})
export class AppModule {}
