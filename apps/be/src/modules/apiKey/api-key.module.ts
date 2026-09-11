import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyController } from './controller/api-key.controller.js';
import { ApiKey } from './entity/api-key.entity.js';
import { ApiKeyGuard } from './guard/api-key.guard.js';
import { ApiKeyService } from './service/api-key.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  providers: [ApiKeyService, ApiKeyGuard],
  controllers: [ApiKeyController],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class ApiKeyModule {}
