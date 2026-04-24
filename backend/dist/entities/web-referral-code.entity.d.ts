import { WebUser } from './web-user.entity';
export declare class WebReferralCode {
    id: number;
    user_id: number;
    user: WebUser;
    code: string;
    created_at: Date;
}
