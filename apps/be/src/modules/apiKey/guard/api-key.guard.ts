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

    const apiKey = await this.apiKeyService.validateApiKey(rawKey);
    if (!apiKey) throw new UnauthorizedException('Invalid API key');

    request.userId = apiKey.userId;
    return true;
  }
}
