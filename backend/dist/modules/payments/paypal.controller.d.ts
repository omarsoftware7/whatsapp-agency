import { SessionUser } from '../../common/decorators/current-user.decorator';
import { PaypalService } from './paypal.service';
export declare class PaypalController {
    private readonly paypal;
    constructor(paypal: PaypalService);
    createSubscription(body: {
        plan_tier: string;
        plan_interval: string;
        trial_days?: number;
    }, user: SessionUser): Promise<{
        subscription_id: any;
        approval_url: any;
    }>;
    complete(body: {
        subscription_id: string;
    }, user: SessionUser): Promise<{
        success: boolean;
    }>;
    cancel(user: SessionUser): Promise<{
        success: boolean;
    }>;
}
