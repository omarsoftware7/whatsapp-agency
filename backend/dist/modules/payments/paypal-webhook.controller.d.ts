import { Repository } from 'typeorm';
import { PaypalService } from './paypal.service';
import { AuthService } from '../auth/auth.service';
import { WebUser } from '../../entities/web-user.entity';
import { WebPayment } from '../../entities/web-payment.entity';
export declare class PaypalWebhookController {
    private readonly paypal;
    private readonly auth;
    private userRepo;
    private paymentRepo;
    private readonly logger;
    constructor(paypal: PaypalService, auth: AuthService, userRepo: Repository<WebUser>, paymentRepo: Repository<WebPayment>);
    handle(body: any, headers: any): Promise<{
        received: boolean;
    }>;
}
