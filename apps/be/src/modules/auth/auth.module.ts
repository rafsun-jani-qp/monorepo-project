import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UserModules } from '../users/userModules.js';
import { AuthController } from './controller/auth.controller.js';
import { AuthGuard } from './guard/auth.guard.js';
import { AuthService } from './service/auth.service.js';

@Module({
  imports: [UserModules],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
