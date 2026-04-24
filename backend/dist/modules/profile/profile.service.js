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
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const web_user_entity_1 = require("../../entities/web-user.entity");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_referral_entity_1 = require("../../entities/web-referral.entity");
const web_user_client_entity_1 = require("../../entities/web-user-client.entity");
let ProfileService = class ProfileService {
    constructor(userRepo, jobRepo, refRepo, wucRepo) {
        this.userRepo = userRepo;
        this.jobRepo = jobRepo;
        this.refRepo = refRepo;
        this.wucRepo = wucRepo;
    }
    async updateProfile(userId, dto) {
        await this.userRepo.update(userId, dto);
        return this.userRepo.findOne({ where: { id: userId } });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || !(await user.validatePassword(currentPassword))) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        await user.setPassword(newPassword);
        await this.userRepo.save(user);
        return { success: true };
    }
    async getStats(userId) {
        const links = await this.wucRepo.find({ where: { web_user_id: userId } });
        const clientIds = links.map((l) => l.client_id);
        const designs = clientIds.length
            ? await this.jobRepo.count({ where: { client_id: { $in: clientIds }, design_approved: true } })
            : 0;
        const published = clientIds.length
            ? await this.jobRepo.count({ where: { client_id: { $in: clientIds }, current_stage: 'completed' } })
            : 0;
        const referrals = await this.refRepo.count({ where: { referrer_user_id: userId } });
        return { designs, published, referrals, brands: clientIds.length };
    }
    async getLimits(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user)
            throw new Error('User not found');
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
    async deleteAccount(userId) {
        await this.userRepo.update(userId, { is_active: false });
        return { success: true };
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(web_user_entity_1.WebUser)),
    __param(1, (0, typeorm_1.InjectRepository)(creative_job_entity_1.CreativeJob)),
    __param(2, (0, typeorm_1.InjectRepository)(web_referral_entity_1.WebReferral)),
    __param(3, (0, typeorm_1.InjectRepository)(web_user_client_entity_1.WebUserClient)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ProfileService);
//# sourceMappingURL=profile.service.js.map