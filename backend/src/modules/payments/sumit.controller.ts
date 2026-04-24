import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { SumitService } from './sumit.service';

@Controller('payments/sumit')
@UseGuards(SessionGuard)
export class SumitController {
  constructor(private readonly sumit: SumitService) {}

  @Post('create-subscription')
  create(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.sumit.createSubscription(user.id, body.plan_tier, body);
  }

  @Post('cancel')
  cancel(@CurrentUser() user: SessionUser) {
    return this.sumit.cancelSubscription(user.id);
  }
}
