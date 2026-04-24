import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebUser } from '../../entities/web-user.entity';
import { Client } from '../../entities/client.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebPayment } from '../../entities/web-payment.entity';
import { WebReferral } from '../../entities/web-referral.entity';
import { ActivityLog } from '../../entities/activity-log.entity';
import { PLAN_CREDITS } from '../auth/auth.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(WebUser) private userRepo: Repository<WebUser>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    @InjectRepository(WebPayment) private paymentRepo: Repository<WebPayment>,
    @InjectRepository(WebReferral) private refRepo: Repository<WebReferral>,
    @InjectRepository(ActivityLog) private activityRepo: Repository<ActivityLog>,
  ) {}

  async listUsers() {
    const users = await this.userRepo.find({ order: { created_at: 'DESC' } });
    return Promise.all(users.map(async (u) => {
      const payments = await this.paymentRepo.find({ where: { web_user_id: u.id, status: 'success' } });
      const referrals = await this.refRepo.count({ where: { referrer_user_id: u.id } });
      const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return { ...u, total_revenue: totalRevenue, referral_count: referrals };
    }));
  }

  async createUser(dto: any) {
    const user = this.userRepo.create(dto) as unknown as WebUser;
    if (dto.password) await user.setPassword(dto.password);
    return this.userRepo.save(user);
  }

  async updateUser(userId: number, dto: any) {
    const { credits, ...rest } = dto;
    if (credits) {
      const planCredits = PLAN_CREDITS[dto.plan_tier] || {};
      Object.assign(rest, {
        text_credits_remaining: credits.text ?? planCredits.text,
        image_credits_remaining: credits.image ?? planCredits.image,
        video_credits_remaining: credits.video ?? planCredits.video,
        landing_credits_remaining: credits.landing ?? planCredits.landing,
      });
    }
    await this.userRepo.update(userId, rest);
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async listBrands() {
    return this.clientRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.userLinks', 'wuc')
      .leftJoinAndSelect('wuc.webUser', 'u')
      .leftJoinAndSelect('c.brandProfile', 'bp')
      .orderBy('c.created_at', 'DESC')
      .getMany();
  }

  async listJobs(search?: string, page = 1, limit = 50) {
    const qb = this.jobRepo.createQueryBuilder('j').leftJoinAndSelect('j.client', 'c').orderBy('j.created_at', 'DESC');
    if (search) qb.where('j.user_message ILIKE :s OR c.business_name ILIKE :s', { s: `%${search}%` });
    qb.skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async listLandingPages(page = 1, limit = 50) {
    // re-use generic listing
    return { items: [], total: 0, page, limit };
  }

  async getMetrics(periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const activeUsers = await this.userRepo.count({ where: { subscription_status: 'active' } });
    const trialUsers = await this.userRepo.count({ where: { subscription_status: 'trial' } });
    const totalUsers = await this.userRepo.count();

    const payments = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.status = :s AND p.created_at >= :since', { s: 'success', since })
      .getMany();
    const mrr = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const totalJobs = await this.jobRepo.count();
    const publishedJobs = await this.jobRepo.count({ where: { current_stage: 'completed' } });

    const referrals = await this.refRepo.count();

    return {
      active_users: activeUsers,
      trial_users: trialUsers,
      total_users: totalUsers,
      mrr,
      arr: mrr * 12,
      arpu: activeUsers ? mrr / activeUsers : 0,
      total_jobs: totalJobs,
      published_jobs: publishedJobs,
      publishing_rate: totalJobs ? ((publishedJobs / totalJobs) * 100).toFixed(1) : '0',
      total_referrals: referrals,
      period_days: periodDays,
    };
  }
}
