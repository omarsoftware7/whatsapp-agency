import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebUser } from '../../entities/web-user.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebReferral } from '../../entities/web-referral.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    @InjectRepository(WebReferral) private refRepo: Repository<WebReferral>,
    @InjectRepository(WebUserClient) private wucRepo: Repository<WebUserClient>,
  ) {}

  async updateProfile(userId: number, dto: { first_name?: string; last_name?: string; theme_mode?: string }) {
    await this.userRepo.update(userId, dto);
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !(await user.validatePassword(currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await user.setPassword(newPassword);
    await this.userRepo.save(user);
    return { success: true };
  }

  async getStats(userId: number) {
    const links = await this.wucRepo.find({ where: { web_user_id: userId } });
    const clientIds = links.map((l) => l.client_id);

    const designs = clientIds.length
      ? await this.jobRepo.count({ where: { client_id: { $in: clientIds } as any, design_approved: true } })
      : 0;

    const published = clientIds.length
      ? await this.jobRepo.count({ where: { client_id: { $in: clientIds } as any, current_stage: 'completed' } })
      : 0;

    const referrals = await this.refRepo.count({ where: { referrer_user_id: userId } });

    return { designs, published, referrals, brands: clientIds.length };
  }

  async getLimits(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    return {
      plan_tier: user.plan_tier,
      text_credits: user.text_credits_remaining,
      image_credits: user.image_credits_remaining,
      video_credits: user.video_credits_remaining,
      landing_credits: user.landing_credits_remaining,
      max_brands: user.max_brands,
      credits_reset_at: user.credits_reset_at,
    };
  }

  async deleteAccount(userId: number) {
    await this.userRepo.update(userId, { is_active: false });
    return { success: true };
  }
}
