import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ApiKey } from '../../entities/api-key.entity';
export declare class ApiKeyGuard implements CanActivate {
    private readonly apiKeyRepo;
    constructor(apiKeyRepo: Repository<ApiKey>);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractKey;
}
