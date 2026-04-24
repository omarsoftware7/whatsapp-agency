import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Client } from '../../entities/client.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
export declare class WhatsappService {
    private clientRepo;
    private jobRepo;
    private logRepo;
    private readonly config;
    private readonly logger;
    constructor(clientRepo: Repository<Client>, jobRepo: Repository<CreativeJob>, logRepo: Repository<ActivityLog>, config: ConfigService);
    private logActivity;
    private checkProcessingLock;
    private addVideoDataIfApplicable;
    downloadWhatsappMedia(mediaId: string, jobId: number | string, subdirHint?: 'products' | 'logos' | 'generated', directUrl?: string, mimeTypeHint?: string): Promise<string | null>;
    handleMessage(body: any): Promise<any>;
    private getActiveJob;
    private menuText;
    getJob(jobId: number): Promise<{
        job: CreativeJob;
    } | null>;
    setLock(jobId: number): Promise<{
        status: string;
        job_id: number;
    }>;
    releaseLock(jobId: number): Promise<{
        status: string;
        job_id: number;
    }>;
    saveInput(jobId: number, userMessage: string, userImages: string[] | null): Promise<{
        status: string;
        job_id: number;
        next_step: string;
    }>;
    saveDesign(jobId: number, designVariations: string[], designPrompt: string, mediaType?: string): Promise<{
        status: string;
        job_id: number;
        variation_count: number;
        media_type: string;
        next_step: string;
    }>;
    approveDesign(jobId: number, approvedIndex: number): Promise<{
        status: string;
        job_id: number;
        approved_index: number;
        approved_design_url: string;
        design_variations: string[];
        next_step: string;
    } | null>;
    rejectDesign(jobId: number): Promise<{
        status: string;
        job_id: number;
        next_step: string;
        design_variations: string[];
    } | null>;
    saveCopy(jobId: number, adCopy: any): Promise<{
        status: string;
        job_id: number;
        ad_copy: string;
        next_step: string;
    }>;
    approveCopy(jobId: number): Promise<{
        status: string;
        job_id: number;
        next_step: string;
    }>;
    rejectCopy(jobId: number): Promise<{
        status: string;
        job_id: number;
        next_step: string;
    } | null>;
    undoDesignApproval(jobId: number): Promise<{
        status: string;
        job_id: number;
        current_stage: string;
    } | null>;
    undoCopyApproval(jobId: number): Promise<{
        status: string;
        job_id: number;
        current_stage: string;
    } | null>;
    approvePublish(jobId: number): Promise<{
        status: string;
        job_id: number;
        next_step: string;
    }>;
    saveBulkProducts(jobId: number, products: any[]): Promise<{
        status: string;
        job_id: number;
        product_count: number;
        next_step: string;
    }>;
    approveTemplate(jobId: number): Promise<{
        status: string;
        job_id: number;
        next_step: string;
    }>;
    saveReel(jobId: number, reelUrl: string, durationSeconds: number | null): Promise<{
        status: string;
        job_id: number;
        reel_url: string;
    }>;
    onboardingLogoUploaded(clientId: number, logoUrl: string, logoFilename: string): Promise<{
        status: string;
        client_id: number;
        logo_filename: string;
        next_step: string;
        gpt5_instructions: string;
    }>;
    onboardingLogoAnalyzed(clientId: number, primaryColor: string, secondaryColor: string): Promise<{
        status: string;
        client_id: number;
        next_step: string;
    }>;
    onboardingBusinessDescribed(clientId: number, description: string): Promise<{
        status: string;
        client_id: number;
        description: string;
        next_step: string;
        gpt5_instructions: string;
    }>;
    onboardingProfileInferred(clientId: number, profile: any): Promise<{
        status: string;
        client_id: number;
        brand_profile: any;
        message: string;
    }>;
    saveMetaTokens(clientId: number, pageToken: string, pageId: string, igAccountId: string | null, tokenExpires: number | null): Promise<{
        status: string;
        client_id: number;
        page_id: string;
        instagram_account_id: string | null;
        expires: Date | null;
    }>;
    getMetaStatus(clientId: number): Promise<{
        connected: number;
        page_id: string;
        instagram_account_id: string;
        expires: Date;
        expires_soon: boolean;
    }>;
    getClientInfo(clientId: number): Promise<{
        id: number;
        phone_number: string;
        business_name: string;
        business_description: string;
        logo_url: string | null;
        primary_color: string;
        secondary_color: string;
        font_preference: string;
        brand_tone: string;
        industry: string;
        default_language: string;
        onboarding_complete: boolean;
        brand_assets: {
            logo_url: string | null;
            primary_color: string;
            secondary_color: string;
            business_name: string;
            brand_tone: string;
            font_preference: string;
            industry: string;
            default_language: string;
        };
        client: {
            id: number;
            phone_number: string;
            business_name: string;
            logo_url: string | null;
            primary_color: string;
            secondary_color: string;
            brand_assets: {
                logo_url: string | null;
                primary_color: string;
                secondary_color: string;
                business_name: string;
                brand_tone: string;
                font_preference: string;
                industry: string;
                default_language: string;
            };
        };
    }>;
    addMultiProduct(jobId: number, productData: any): Promise<{
        status: string;
        job_id: number;
        product_count: number;
    }>;
    updateLastProduct(jobId: number, productData: any): Promise<{
        status: string;
        job_id: number;
        updated_product: any;
    }>;
    saveMultiVariants(jobId: number, designVariations: string[]): Promise<{
        status: string;
        job_id: number;
        design_count: number;
        next_step: string;
    }>;
    publishForClient(jobId: number): Promise<{
        status: string;
        job_id: number;
        results: Record<string, any>;
    }>;
    formatAdCopyCaption(adCopy: string): string;
}
