import { SessionUser } from '../../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
export declare class ProfileController {
    private readonly service;
    constructor(service: ProfileService);
    update(body: {
        first_name?: string;
        last_name?: string;
        theme_mode?: string;
    }, user: SessionUser): Promise<import("../../entities/web-user.entity").WebUser | null>;
    changePassword(body: {
        current_password: string;
        new_password: string;
    }, user: SessionUser): Promise<{
        success: boolean;
    }>;
    stats(user: SessionUser): Promise<{
        designs: number;
        published: number;
        referrals: number;
        brands: number;
    }>;
    limits(user: SessionUser): Promise<{
        plan_tier: import("../../entities/web-user.entity").PlanTier;
        text_credits: number;
        image_credits: number;
        video_credits: number;
        landing_credits: number;
        max_brands: number;
        credits_reset_at: Date;
    }>;
    deleteAccount(user: SessionUser): Promise<{
        success: boolean;
    }>;
}
