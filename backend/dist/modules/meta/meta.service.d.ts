import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
export declare class MetaService {
    private readonly config;
    private profileRepo;
    private readonly graphBase;
    constructor(config: ConfigService, profileRepo: Repository<WebBrandProfile>);
    getOAuthStatus(clientId: number): Promise<{
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
    publish(job: CreativeJob, publishType: 'post' | 'story', profile: WebBrandProfile): Promise<{
        facebook_post_id: any;
        instagram_post_id: any;
    }>;
    private publishFacebook;
    private publishInstagram;
    exchangeCodeForToken(code: string, redirectUri: string): Promise<{
        pageId: string;
        pageToken: string;
        igAccountId: string;
        expires: Date;
    }>;
    private sleep;
}
declare module '../../entities/web-brand-profile.entity' {
    interface WebBrandProfile {
        meta_instagram_account_id(self: WebBrandProfile): string;
    }
}
