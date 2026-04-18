import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { WebUser } from '../../entities/web-user.entity';
import { WebPayment } from '../../entities/web-payment.entity';
import { PLAN_CREDITS } from '../auth/auth.service';

const PLAN_PRICES: Record<string, Record<string, string>> = {
  starter: { monthly: '179', yearly: '1716' },
  growth:  { monthly: '449', yearly: '4309' },
  pro:     { monthly: '899', yearly: '8630' },
  agency:  { monthly: '1499', yearly: '14390' },
};

@Injectable()
export class PaypalService {
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    @InjectRepository(WebPayment) private paymentRepo: Repository<WebPayment>,
  ) {
    this.baseUrl = config.get('PAYPAL_BASE_URL', 'https://api-m.paypal.com');
  }

  private async getAccessToken(): Promise<string> {
    const res = await axios.post(
      `${this.baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: {
          username: this.config.get('PAYPAL_CLIENT_ID'),
          password: this.config.get('PAYPAL_CLIENT_SECRET'),
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    return res.data.access_token;
  }

  async createSubscription(planTier: string, planInterval: string, userId: number, trialDays = 7) {
    const token = await this.getAccessToken();
    const planId = this.config.get(`PAYPAL_PLAN_ID_${planTier.toUpperCase()}_${planInterval.toUpperCase()}`);
    if (!planId) throw new BadRequestException('PayPal plan not configured for this tier');

    const res = await axios.post(
      `${this.baseUrl}/v1/billing/subscriptions`,
      {
        plan_id: planId,
        application_context: {
          brand_name: 'Launcho',
          return_url: `${this.config.get('FRONTEND_URL')}/pricing?payment=success`,
          cancel_url: `${this.config.get('FRONTEND_URL')}/pricing?payment=cancel`,
        },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );

    return { subscription_id: res.data.id, approval_url: res.data.links.find((l: any) => l.rel === 'approve')?.href };
  }

  async activateSubscription(subscriptionId: string, userId: number) {
    const token = await this.getAccessToken();
    const res = await axios.get(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const sub = res.data;
    const planTierId = sub.plan_id;
    // Resolve planTier from planId mapping (stored in config)
    const planTier = this.resolvePlanTier(planTierId);
    const planInterval = sub.billing_info?.cycle_executions?.[0]?.tenure_type === 'REGULAR' ? 'monthly' : 'monthly';

    await this.applyActivePlan(userId, planTier, planInterval, subscriptionId, 'paypal');
    await this.paymentRepo.save(
      this.paymentRepo.create({ web_user_id: userId, provider: 'paypal', amount: parseFloat(PLAN_PRICES[planTier]?.[planInterval] || '0'), currency: 'ILS', status: 'success', reference: subscriptionId }),
    );
    return { success: true };
  }

  async cancelSubscription(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.paypal_subscription_id) throw new BadRequestException('No active PayPal subscription');

    const token = await this.getAccessToken();
    await axios.post(
      `${this.baseUrl}/v1/billing/subscriptions/${user.paypal_subscription_id}/cancel`,
      { reason: 'User requested cancellation' },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    await this.userRepo.update(userId, { subscription_status: 'canceled' });
    return { success: true };
  }

  async applyActivePlan(userId: number, planTier: string, planInterval: string, subscriptionId: string, provider: string) {
    const credits = PLAN_CREDITS[planTier];
    if (!credits) return;

    const planEnd = new Date();
    planEnd.setMonth(planEnd.getMonth() + (planInterval === 'yearly' ? 12 : 1));

    await this.userRepo.update(userId, {
      plan_tier: planTier as any,
      subscription_status: 'active',
      plan_interval: planInterval as any,
      plan_end_at: planEnd,
      paypal_subscription_id: subscriptionId,
      payment_provider: provider as any,
      subscription_started_at: new Date(),
      text_credits_remaining: credits.text,
      image_credits_remaining: credits.image,
      video_credits_remaining: credits.video,
      landing_credits_remaining: credits.landing,
      max_brands: credits.brands,
    });
  }

  private resolvePlanTier(planId: string): string {
    const tiers = ['starter', 'growth', 'pro', 'agency'];
    for (const tier of tiers) {
      for (const interval of ['monthly', 'yearly']) {
        const configId = this.config.get(`PAYPAL_PLAN_ID_${tier.toUpperCase()}_${interval.toUpperCase()}`);
        if (configId === planId) return tier;
      }
    }
    return 'starter';
  }
}
