import { WebUser } from './web-user.entity';
export declare class WebPayment {
    id: number;
    web_user_id: number;
    webUser: WebUser;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    reference: string;
    created_at: Date;
}
