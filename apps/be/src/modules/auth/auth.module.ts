import { Module } from '@nestjs/common';
import { UserModules } from '../users/userModules.js';
import { AuthController } from './controller/auth.controller.js';
import { AuthService } from './service/auth.service.js';

@Module({
  imports: [UserModules],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
