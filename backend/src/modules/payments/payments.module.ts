import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';
import { PaypalWebhookController } from './paypal-webhook.controller';
import { SumitController } from './sumit.controller';
import { SumitService } from './sumit.service';
import { WebUser } from '../../entities/web-user.entity';
import { WebPayment } from '../../entities/web-payment.entity';
import { WebReferral } from '../../entities/web-referral.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([WebUser, WebPayment, WebReferral]), AuthModule],
  controllers: [PaypalController, PaypalWebhookController, SumitController],
  providers: [PaypalService, SumitService],
})
export class PaymentsModule {}
