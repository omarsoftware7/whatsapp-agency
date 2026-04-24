"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const web_user_entity_1 = require("../../entities/web-user.entity");
const client_entity_1 = require("../../entities/client.entity");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_payment_entity_1 = require("../../entities/web-payment.entity");
const web_referral_entity_1 = require("../../entities/web-referral.entity");
const activity_log_entity_1 = require("../../entities/activity-log.entity");
const auth_service_1 = require("../auth/auth.service");
let AdminService = class AdminService {
    constructor(userRepo, clientRepo, jobRepo, paymentRepo, refRepo, activityRepo) {
        this.userRepo = userRepo;
        this.clientRepo = clientRepo;
        this.jobRepo = jobRepo;
        this.paymentRepo = paymentRepo;
        this.refRepo = refRepo;
        this.activityRepo = activityRepo;
    }
    async listUsers() {
        const users = await this.userRepo.find({ order: { created_at: 'DESC' } });
        return Promise.all(users.map(async (u) => {
            const payments = await this.paymentRepo.find({ where: { web_user_id: u.id, status: 'success' } });
            const referrals = await this.refRepo.count({ where: { referrer_user_id: u.id } });
            const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
            return { ...u, total_revenue: totalRevenue, referral_count: referrals };
        }));
    }
    async createUser(dto) {
        const user = this.userRepo.create(dto);
        if (dto.password)
            await user.setPassword(dto.password);
        return this.userRepo.save(user);
    }
    async updateUser(userId, dto) {
        const { credits, ...rest } = dto;
        if (credits) {
            const planCredits = auth_service_1.PLAN_CREDITS[dto.plan_tier] || {};
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
    async listJobs(search, page = 1, limit = 50) {
        const qb = this.jobRepo.createQueryBuilder('j').leftJoinAndSelect('j.client', 'c').orderBy('j.created_at', 'DESC');
        if (search)
            qb.where('j.user_message ILIKE :s OR c.business_name ILIKE :s', { s: `%${search}%` });
        qb.skip((page - 1) * limit).take(limit);
        const [items, total] = await qb.getManyAndCount();
        return { items, total, page, limit };
    }
    async listLandingPages(page = 1, limit = 50) {
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(web_user_entity_1.WebUser)),
    __param(1, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(2, (0, typeorm_1.InjectRepository)(creative_job_entity_1.CreativeJob)),
    __param(3, (0, typeorm_1.InjectRepository)(web_payment_entity_1.WebPayment)),
    __param(4, (0, typeorm_1.InjectRepository)(web_referral_entity_1.WebReferral)),
    __param(5, (0, typeorm_1.InjectRepository)(activity_log_entity_1.ActivityLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AdminService);
//# sourceMappingURL=admin.service.js.map