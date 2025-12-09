import { Module } from '@nestjs/common';
import { AppController, UserController } from './app.controller';
import { AppService, UserService } from './app.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AppController, UserController],
  providers: [AppService, UserService],
})
export class AppModule {}
