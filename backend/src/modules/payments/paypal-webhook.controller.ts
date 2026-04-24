import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaypalService } from './paypal.service';
import { AuthService } from '../auth/auth.service';
import { WebUser } from '../../entities/web-user.entity';
import { WebPayment } from '../../entities/web-payment.entity';

@Controller('webhooks/paypal')
export class PaypalWebhookController {
  private readonly logger = new Logger(PaypalWebhookController.name);

  constructor(
    private readonly paypal: PaypalService,
    private readonly auth: AuthService,
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    @InjectRepository(WebPayment) private paymentRepo: Repository<WebPayment>,
  ) {}

  @Post()
  async handle(@Body() body: any, @Headers() headers: any) {
    const eventType = body.event_type;
    this.logger.log(`PayPal webhook: ${eventType}`);

    const subscriptionId = body.resource?.id || body.resource?.billing_agreement_id;
    const user = subscriptionId
      ? await this.userRepo.findOne({ where: { paypal_subscription_id: subscriptionId } })
      : null;

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
        if (user) {
          await this.paypal.applyActivePlan(user.id, user.plan_tier, user.plan_interval, subscriptionId, 'paypal');
        }
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        if (user) {
          await this.userRepo.update(user.id, { subscription_status: 'canceled', plan_tier: 'expired' });
        }
        break;

      case 'PAYMENT.SALE.COMPLETED':
        if (user) {
          const amount = parseFloat(body.resource?.amount?.total || '0');
          await this.paymentRepo.save(
            this.paymentRepo.create({ web_user_id: user.id, provider: 'paypal', amount, currency: body.resource?.amount?.currency || 'ILS', status: 'success', reference: body.resource?.id }),
          );
          await this.auth.applyReferralRewards(user.id);
        }
        break;

      case 'PAYMENT.SALE.DENIED':
        if (user) {
          await this.userRepo.update(user.id, { subscription_status: 'past_due' });
        }
        break;
    }

    return { received: true };
  }
}
