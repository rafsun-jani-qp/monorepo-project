import { Module } from '@nestjs/common';
import { UserController } from './controller/user.controller.js';
import { UserService } from './service/user.service.js';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModules {}
