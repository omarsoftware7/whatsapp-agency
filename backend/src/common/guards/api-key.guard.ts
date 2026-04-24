import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../entities/api-key.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = this.extractKey(request);
    if (!key) throw new UnauthorizedException('Missing API key');

    const found = await this.apiKeyRepo.findOne({
      where: { key_value: key, is_active: true },
    });
    if (!found) throw new UnauthorizedException('Invalid API key');
    return true;
  }

  private extractKey(request: any): string | null {
    const header = request.headers['x-api-key'];
    if (header) return header;

    const auth = request.headers['authorization'];
    if (auth?.startsWith('Bearer ')) return auth.slice(7);

    return request.query?.api_key ?? null;
  }
}
