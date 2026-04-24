import { WebUser } from './web-user.entity';
export declare class WebReferral {
    id: number;
    referrer_user_id: number;
    referred_user_id: number;
    code: string;
    status: string;
    discount_applied: boolean;
    rewarded_at: Date;
    referrer: WebUser;
    referred: WebUser;
    created_at: Date;
}
