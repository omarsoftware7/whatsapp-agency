import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { MetaService } from './meta.service';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
export declare class MetaOAuthController {
    private readonly meta;
    private readonly config;
    private profileRepo;
    constructor(meta: MetaService, config: ConfigService, profileRepo: Repository<WebBrandProfile>);
    status(id: number): Promise<{
        connected: boolean;
        page_id?: undefined;
        instagram_account_id?: undefined;
        expires_at?: undefined;
        expires_soon?: undefined;
    } | {
        connected: boolean;
        page_id: string;
        instagram_account_id: string;
        expires_at: Date;
        expires_soon: boolean;
    }>;
    startOAuth(id: number, req: any, res: any): void;
    callback(id: number, code: string, res: any): Promise<void>;
}
