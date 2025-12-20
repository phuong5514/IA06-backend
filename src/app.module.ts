import { Module } from '@nestjs/common';
import { AppController} from './app.controller';
import { AppService, UserService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [AppController],
  providers: [AppService, UserService],
})
export class AppModule {}
