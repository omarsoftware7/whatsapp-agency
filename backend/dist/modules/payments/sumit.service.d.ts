import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { WebUser } from '../../entities/web-user.entity';
import { WebPayment } from '../../entities/web-payment.entity';
import { PaypalService } from './paypal.service';
export declare class SumitService {
    private readonly config;
    private userRepo;
    private paymentRepo;
    private readonly paypalService;
    constructor(config: ConfigService, userRepo: Repository<WebUser>, paymentRepo: Repository<WebPayment>, paypalService: PaypalService);
    createSubscription(userId: number, planTier: string, cardDetails: any): Promise<{
        success: boolean;
    }>;
    cancelSubscription(userId: number): Promise<{
        success: boolean;
    }>;
}
