import { Module } from '@nestjs/common';
import { AppController, UserController } from './app.controller';
import { AppService, UserService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController, UserController],
  providers: [AppService, UserService],
})
export class AppModule {}
