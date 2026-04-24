import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SessionUser } from '../../common/decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, req: any): Promise<{
        success: boolean;
        user: {
            web_user_id: number;
            web_user_email: string;
            web_user_role: string;
            web_user_max_brands: number;
            web_user_first_name: string;
            web_user_last_name: string;
            web_user_avatar_url: string;
            web_user_theme_mode: string;
            web_user_plan_tier: import("../../entities/web-user.entity").PlanTier;
            web_user_plan_interval: string;
            web_user_subscription_status: import("../../entities/web-user.entity").SubscriptionStatus;
            web_user_trial_end_at: Date;
            web_user_plan_end_at: Date;
            web_user_credits_remaining: number;
            web_user_text_credits: number;
            web_user_image_credits: number;
            web_user_video_credits: number;
            web_user_landing_credits: number;
            web_user_credits_reset_at: Date;
            web_user_payment_provider: string;
        };
    }>;
    login(dto: LoginDto, req: any): Promise<{
        success: boolean;
        user: {
            web_user_id: number;
            web_user_email: string;
            web_user_role: string;
            web_user_max_brands: number;
            web_user_first_name: string;
            web_user_last_name: string;
            web_user_avatar_url: string;
            web_user_theme_mode: string;
            web_user_plan_tier: import("../../entities/web-user.entity").PlanTier;
            web_user_plan_interval: string;
            web_user_subscription_status: import("../../entities/web-user.entity").SubscriptionStatus;
            web_user_trial_end_at: Date;
            web_user_plan_end_at: Date;
            web_user_credits_remaining: number;
            web_user_text_credits: number;
            web_user_image_credits: number;
            web_user_video_credits: number;
            web_user_landing_credits: number;
            web_user_credits_reset_at: Date;
            web_user_payment_provider: string;
        };
    }>;
    logout(req: any): {
        success: boolean;
    };
    me(user: SessionUser, req: any): Promise<{
        success: boolean;
        user: {
            referral_code: string | null;
            web_user_id: number;
            web_user_email: string;
            web_user_role: string;
            web_user_max_brands: number;
            web_user_first_name: string;
            web_user_last_name: string;
            web_user_avatar_url: string;
            web_user_theme_mode: string;
            web_user_plan_tier: import("../../entities/web-user.entity").PlanTier;
            web_user_plan_interval: string;
            web_user_subscription_status: import("../../entities/web-user.entity").SubscriptionStatus;
            web_user_trial_end_at: Date;
            web_user_plan_end_at: Date;
            web_user_credits_remaining: number;
            web_user_text_credits: number;
            web_user_image_credits: number;
            web_user_video_credits: number;
            web_user_landing_credits: number;
            web_user_credits_reset_at: Date;
            web_user_payment_provider: string;
        };
    }>;
    applyReferral(body: {
        referral_code: string;
    }, user: SessionUser): Promise<{
        success: boolean;
    }>;
}
