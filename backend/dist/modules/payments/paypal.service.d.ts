import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { WebUser } from '../../entities/web-user.entity';
import { WebPayment } from '../../entities/web-payment.entity';
export declare class PaypalService {
    private readonly config;
    private userRepo;
    private paymentRepo;
    private readonly baseUrl;
    constructor(config: ConfigService, userRepo: Repository<WebUser>, paymentRepo: Repository<WebPayment>);
    private getAccessToken;
    createSubscription(planTier: string, planInterval: string, userId: number, trialDays?: number): Promise<{
        subscription_id: any;
        approval_url: any;
    }>;
    activateSubscription(subscriptionId: string, userId: number): Promise<{
        success: boolean;
    }>;
    cancelSubscription(userId: number): Promise<{
        success: boolean;
    }>;
    applyActivePlan(userId: number, planTier: string, planInterval: string, subscriptionId: string, provider: string): Promise<void>;
    private resolvePlanTier;
}
