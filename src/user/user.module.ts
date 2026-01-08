import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from '../app.service';
import { AuthModule } from '../auth/auth.module';
import { RegistrationService } from '../auth/registration.service';
import { GcsService } from '../menu/gcs.service';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserService, RegistrationService, GcsService],
  exports: [UserService],
})
export class UserModule {}
