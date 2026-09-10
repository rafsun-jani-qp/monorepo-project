import { Module } from '@nestjs/common';
import { UserModules } from '../users/userModules.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [UserModules],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
