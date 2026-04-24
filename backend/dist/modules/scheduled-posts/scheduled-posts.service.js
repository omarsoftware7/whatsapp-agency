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
var ScheduledPostsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledPostsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const web_scheduled_post_entity_1 = require("../../entities/web-scheduled-post.entity");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_brand_profile_entity_1 = require("../../entities/web-brand-profile.entity");
const meta_service_1 = require("../meta/meta.service");
let ScheduledPostsService = ScheduledPostsService_1 = class ScheduledPostsService {
    constructor(postRepo, jobRepo, profileRepo, meta) {
        this.postRepo = postRepo;
        this.jobRepo = jobRepo;
        this.profileRepo = profileRepo;
        this.meta = meta;
        this.logger = new common_1.Logger(ScheduledPostsService_1.name);
    }
    async list(clientId) {
        return this.postRepo.find({
            where: { client_id: clientId },
            relations: ['job'],
            order: { scheduled_at: 'ASC' },
        });
    }
    async schedule(jobId, clientId, scheduledAt, publishType) {
        const existing = await this.postRepo.findOne({ where: { job_id: jobId } });
        if (existing) {
            existing.scheduled_at = scheduledAt;
            existing.publish_type = publishType;
            existing.status = 'pending';
            return this.postRepo.save(existing);
        }
        return this.postRepo.save(this.postRepo.create({ job_id: jobId, client_id: clientId, scheduled_at: scheduledAt, publish_type: publishType }));
    }
    async cancel(scheduleId) {
        await this.postRepo.update(scheduleId, { status: 'cancelled' });
        return { success: true };
    }
    async processScheduled() {
        const due = await this.postRepo.find({
            where: { status: 'pending' },
            relations: ['job'],
        });
        const now = new Date();
        for (const post of due) {
            if (post.scheduled_at > now)
                continue;
            const profile = await this.profileRepo.findOne({ where: { client_id: post.client_id } });
            if (!profile)
                continue;
            try {
                await this.meta.publish(post.job, post.publish_type, profile);
                post.status = 'published';
                post.published_at = new Date();
            }
            catch (e) {
                post.status = 'failed';
                post.error_message = String(e);
                this.logger.error(`Scheduled publish failed for post ${post.id}: ${e}`);
            }
            await this.postRepo.save(post);
        }
    }
};
exports.ScheduledPostsService = ScheduledPostsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledPostsService.prototype, "processScheduled", null);
exports.ScheduledPostsService = ScheduledPostsService = ScheduledPostsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(web_scheduled_post_entity_1.WebScheduledPost)),
    __param(1, (0, typeorm_1.InjectRepository)(creative_job_entity_1.CreativeJob)),
    __param(2, (0, typeorm_1.InjectRepository)(web_brand_profile_entity_1.WebBrandProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        meta_service_1.MetaService])
], ScheduledPostsService);
//# sourceMappingURL=scheduled-posts.service.js.map