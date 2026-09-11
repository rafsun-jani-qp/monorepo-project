import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyModule } from '../apiKey/api-key.module.js';
import { UserController } from './controller/user.controller.js';
import { User } from './entity/user.entity.js';
import { UserService } from './service/user.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ApiKeyModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModules {}
