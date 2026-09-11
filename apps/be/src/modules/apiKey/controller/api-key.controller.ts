import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../../auth/guard/auth.guard.js';
import { ApiKey } from '../entity/api-key.entity.js';
import { ApiKeyService } from '../service/api-key.service.js';

@Controller('api-key')
export class ApiKeyController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    @InjectRepository(ApiKey) private apikeyRepository: Repository<ApiKey>,
  ) {}

  @UseGuards(AuthGuard)
  @Post()
  async createApiKey(@Body() userId: string, label?: string) {
    return this.apiKeyService.generateApiKey(userId, label);
  }

  //   @UseGuards(AuthGuard)
  //   @Delete(':id')
  //   async revoke(@Param('id') id: string, @Req() req) {
  //     const key = await this.apikeyRepository.findOne({
  //       where: { id, userId: req.user.id },
  //     });
  //     if (!key) throw new NotFoundException();
  //     key.revokedAt = new Date();
  //     return this.apikeyRepository.save(key);
  //   }
}
