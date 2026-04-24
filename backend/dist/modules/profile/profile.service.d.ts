import { Repository } from 'typeorm';
import { WebUser } from '../../entities/web-user.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebReferral } from '../../entities/web-referral.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';
export declare class ProfileService {
    private userRepo;
    private jobRepo;
    private refRepo;
    private wucRepo;
    constructor(userRepo: Repository<WebUser>, jobRepo: Repository<CreativeJob>, refRepo: Repository<WebReferral>, wucRepo: Repository<WebUserClient>);
    updateProfile(userId: number, dto: {
        first_name?: string;
        last_name?: string;
        theme_mode?: string;
    }): Promise<WebUser | null>;
    changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    getStats(userId: number): Promise<{
        designs: number;
        published: number;
        referrals: number;
        brands: number;
    }>;
    getLimits(userId: number): Promise<{
        plan_tier: import("../../entities/web-user.entity").PlanTier;
        text_credits: number;
        image_credits: number;
        video_credits: number;
        landing_credits: number;
        max_brands: number;
        credits_reset_at: Date;
    }>;
    deleteAccount(userId: number): Promise<{
        success: boolean;
    }>;
}
