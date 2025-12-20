import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from '../app.service';
import { AuthModule } from '../auth/auth.module';
import { RegistrationService } from '../auth/registration.service';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService, RegistrationService],
  exports: [UserService],
})
export class UserModule {}
