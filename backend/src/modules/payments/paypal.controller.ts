import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { PaypalService } from './paypal.service';

@Controller('payments/paypal')
@UseGuards(SessionGuard)
export class PaypalController {
  constructor(private readonly paypal: PaypalService) {}

  @Post('create-subscription')
  createSubscription(
    @Body() body: { plan_tier: string; plan_interval: string; trial_days?: number },
    @CurrentUser() user: SessionUser,
  ) {
    return this.paypal.createSubscription(body.plan_tier, body.plan_interval, user.id, body.trial_days);
  }

  @Post('complete')
  complete(@Body() body: { subscription_id: string }, @CurrentUser() user: SessionUser) {
    return this.paypal.activateSubscription(body.subscription_id, user.id);
  }

  @Post('cancel')
  cancel(@CurrentUser() user: SessionUser) {
    return this.paypal.cancelSubscription(user.id);
  }
}
