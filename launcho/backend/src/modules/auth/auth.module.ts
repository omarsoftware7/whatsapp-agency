import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthController } from './google-oauth.controller';
import { WebUser } from '../../entities/web-user.entity';
import { WebReferralCode } from '../../entities/web-referral-code.entity';
import { WebReferral } from '../../entities/web-referral.entity';
import { WebUserMeta } from '../../entities/web-user-meta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebUser, WebReferralCode, WebReferral, WebUserMeta])],
  controllers: [AuthController, GoogleOAuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
