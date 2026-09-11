import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from '../service/api-key.service.js';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey = request.headers['x-api-key'] as string;

    if (!rawKey) throw new UnauthorizedException('API key is missing');

    const userId = await this.apiKeyService.validateApiKey(rawKey);
    if (!userId) throw new UnauthorizedException('Invalid API key');

    request.userId = userId;
    return true;
  }
}
