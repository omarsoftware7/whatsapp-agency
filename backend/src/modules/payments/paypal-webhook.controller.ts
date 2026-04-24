import { Controller, Post, Body, Headers, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
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
    private readonly config: ConfigService,
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    @InjectRepository(WebPayment) private paymentRepo: Repository<WebPayment>,
  ) {}

  private verifySignature(headers: Record<string, string>, rawBody: string): boolean {
    const webhookId = this.config.get<string>('PAYPAL_WEBHOOK_ID');
    // If no webhook ID configured, skip verification (dev mode)
    if (!webhookId) {
      this.logger.warn('PAYPAL_WEBHOOK_ID not set — skipping signature verification');
      return true;
    }
    const transmissionId = headers['paypal-transmission-id'];
    const timestamp = headers['paypal-transmission-time'];
    const certUrl = headers['paypal-cert-url'];
    const transmissionSig = headers['paypal-transmission-sig'];
    if (!transmissionId || !timestamp || !transmissionSig) return false;
    // CRC32 of body
    const crc = crc32(rawBody);
    const message = `${transmissionId}|${timestamp}|${webhookId}|${crc}`;
    // PayPal uses RSA-SHA256 with their cert — simplified HMAC check as fallback
    const expected = crypto.createHmac('sha256', webhookId).update(message).digest('base64');
    return crypto.timingSafeEqual(Buffer.from(transmissionSig), Buffer.from(expected));
  }

  @Post()
  async handle(@Body() body: any, @Headers() headers: any, @Body('__raw') rawBody?: string) {
    if (!this.verifySignature(headers, rawBody ?? JSON.stringify(body))) {
      this.logger.warn('PayPal webhook signature verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

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

function crc32(str: string): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
