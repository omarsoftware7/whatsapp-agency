import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { WebUser } from '../../entities/web-user.entity';
import { WebReferralCode } from '../../entities/web-referral-code.entity';
import { WebReferral } from '../../entities/web-referral.entity';
import { WebUserMeta } from '../../entities/web-user-meta.entity';
import { RegisterDto } from './dto/register.dto';

export const PLAN_CREDITS: Record<string, Record<string, number>> = {
  trial:   { text: 10,  image: 10,  video: 2,  landing: 2,  brands: 1  },
  starter: { text: 50,  image: 30,  video: 5,  landing: 5,  brands: 2  },
  growth:  { text: 100, image: 70,  video: 15, landing: 15, brands: 5  },
  pro:     { text: 200, image: 150, video: 30, landing: 30, brands: 15 },
  agency:  { text: 500, image: 400, video: 80, landing: 80, brands: 50 },
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    @InjectRepository(WebReferralCode) private refCodeRepo: Repository<WebReferralCode>,
    @InjectRepository(WebReferral) private refRepo: Repository<WebReferral>,
    @InjectRepository(WebUserMeta) private metaRepo: Repository<WebUserMeta>,
  ) {}

  async register(dto: RegisterDto, referralCode?: string, heardAbout?: string) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const user = this.userRepo.create({
      email: dto.email,
      first_name: dto.first_name,
      last_name: dto.last_name,
      plan_tier: 'expired',
      subscription_status: 'expired',
      text_credits_remaining: 0,
      image_credits_remaining: 0,
      video_credits_remaining: 0,
      landing_credits_remaining: 0,
    });
    await user.setPassword(dto.password);
    await this.userRepo.save(user);

    await this.createReferralCode(user.id);

    if (heardAbout || referralCode) {
      await this.metaRepo.save(
        this.metaRepo.create({ user_id: user.id, heard_about: heardAbout, referral_code_used: referralCode }),
      );
    }

    if (referralCode) {
      await this.applyReferral(user.id, referralCode);
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email, is_active: true } });
    if (!user || !(await user.validatePassword(password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    user.last_login_at = new Date();
    await this.userRepo.save(user);
    await this.applyCreditResetIfNeeded(user);
    return user;
  }

  async findById(id: number) {
    return this.userRepo.findOne({ where: { id } });
  }

  async findOrCreateGoogleUser(profile: { googleId: string; email: string; firstName: string; lastName: string; avatar?: string }) {
    let user = await this.userRepo.findOne({ where: { google_id: profile.googleId } });
    if (!user) user = await this.userRepo.findOne({ where: { email: profile.email } });

    if (!user) {
      user = this.userRepo.create({
        email: profile.email,
        google_id: profile.googleId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        avatar_url: profile.avatar,
        plan_tier: 'expired',
        subscription_status: 'expired',
        text_credits_remaining: 0,
        image_credits_remaining: 0,
        video_credits_remaining: 0,
        landing_credits_remaining: 0,
      });
      await this.userRepo.save(user);
      await this.createReferralCode(user.id);
    } else if (!user.google_id) {
      user.google_id = profile.googleId;
      if (profile.avatar && !user.avatar_url) user.avatar_url = profile.avatar;
      await this.userRepo.save(user);
    }

    user.last_login_at = new Date();
    await this.userRepo.save(user);
    return user;
  }

  async applyReferral(userId: number, code: string) {
    const refCode = await this.refCodeRepo.findOne({ where: { code } });
    if (!refCode || refCode.user_id === userId) return;

    const existing = await this.refRepo.findOne({ where: { referred_user_id: userId } });
    if (existing) return;

    await this.refRepo.save(
      this.refRepo.create({ referrer_user_id: refCode.user_id, referred_user_id: userId, code }),
    );
  }

  async applyReferralRewards(referredUserId: number) {
    const referral = await this.refRepo.findOne({
      where: { referred_user_id: referredUserId, status: 'pending' },
    });
    if (!referral) return;

    await this.userRepo.increment({ id: referral.referrer_user_id }, 'text_credits_remaining', 20);
    await this.userRepo.increment({ id: referral.referrer_user_id }, 'image_credits_remaining', 20);
    await this.userRepo.increment({ id: referral.referrer_user_id }, 'video_credits_remaining', 5);

    referral.status = 'rewarded';
    referral.rewarded_at = new Date();
    await this.refRepo.save(referral);
  }

  async getReferralCode(userId: number): Promise<string | null> {
    const rc = await this.refCodeRepo.findOne({ where: { user_id: userId } });
    return rc?.code ?? null;
  }

  buildSessionData(user: WebUser) {
    return {
      web_user_id: user.id,
      web_user_email: user.email,
      web_user_role: user.role,
      web_user_max_brands: user.max_brands,
      web_user_first_name: user.first_name,
      web_user_last_name: user.last_name,
      web_user_avatar_url: user.avatar_url,
      web_user_theme_mode: user.theme_mode,
      web_user_plan_tier: user.plan_tier,
      web_user_plan_interval: user.plan_interval,
      web_user_subscription_status: user.subscription_status,
      web_user_trial_end_at: user.trial_end_at,
      web_user_plan_end_at: user.plan_end_at,
      web_user_credits_remaining: user.credits_remaining,
      web_user_text_credits: user.text_credits_remaining,
      web_user_image_credits: user.image_credits_remaining,
      web_user_video_credits: user.video_credits_remaining,
      web_user_landing_credits: user.landing_credits_remaining,
      web_user_credits_reset_at: user.credits_reset_at,
      web_user_payment_provider: user.payment_provider,
    };
  }

  private async createReferralCode(userId: number) {
    const code = randomBytes(4).toString('hex');
    const rc = this.refCodeRepo.create({ user_id: userId, code });
    await this.refCodeRepo.save(rc);
    return code;
  }

  private async applyCreditResetIfNeeded(user: WebUser) {
    if (!user.credits_reset_at || user.credits_reset_at <= new Date()) {
      const credits = PLAN_CREDITS[user.plan_tier];
      if (credits) {
        user.text_credits_remaining = credits.text;
        user.image_credits_remaining = credits.image;
        user.video_credits_remaining = credits.video;
        user.landing_credits_remaining = credits.landing;
      }
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      user.credits_reset_at = next;
      await this.userRepo.save(user);
    }
  }
}
