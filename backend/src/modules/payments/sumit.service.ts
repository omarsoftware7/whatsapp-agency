import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { WebUser } from '../../entities/web-user.entity';
import { WebPayment } from '../../entities/web-payment.entity';
import { PaypalService, } from './paypal.service';

@Injectable()
export class SumitService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    @InjectRepository(WebPayment) private paymentRepo: Repository<WebPayment>,
    private readonly paypalService: PaypalService,
  ) {}

  async createSubscription(userId: number, planTier: string, cardDetails: any) {
    const apiKey = this.config.get('SUMIT_API_KEY');
    const companyId = this.config.get('SUMIT_COMPANY_ID');

    const res = await axios.post(
      `https://api.sumit.co.il/billing/recurring/create`,
      { ...cardDetails, plan_tier: planTier },
      { headers: { Authorization: `Bearer ${apiKey}`, 'X-Company-ID': companyId } },
    );

    if (!res.data.success) throw new BadRequestException('Sumit payment failed');

    await this.paypalService.applyActivePlan(userId, planTier, 'monthly', res.data.recurring_id, 'sumit');
    await this.userRepo.update(userId, {
      sumit_customer_id: res.data.customer_id,
      sumit_recurring_id: res.data.recurring_id,
      payment_last4: cardDetails.card_number?.slice(-4),
    });

    await this.paymentRepo.save(
      this.paymentRepo.create({ web_user_id: userId, provider: 'sumit', amount: res.data.amount, currency: 'ILS', status: 'success', reference: res.data.transaction_id }),
    );

    return { success: true };
  }

  async cancelSubscription(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.sumit_recurring_id) throw new BadRequestException('No active Sumit subscription');

    const apiKey = this.config.get('SUMIT_API_KEY');
    const companyId = this.config.get('SUMIT_COMPANY_ID');
    await axios.post(
      `https://api.sumit.co.il/billing/recurring/cancel`,
      { recurring_id: user.sumit_recurring_id },
      { headers: { Authorization: `Bearer ${apiKey}`, 'X-Company-ID': companyId } },
    );

    await this.userRepo.update(userId, { subscription_status: 'canceled' });
    return { success: true };
  }
}
