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
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_multi_product_entity_1 = require("../../entities/web-multi-product.entity");
const web_deleted_job_entity_1 = require("../../entities/web-deleted-job.entity");
const web_design_edit_request_entity_1 = require("../../entities/web-design-edit-request.entity");
const web_user_client_entity_1 = require("../../entities/web-user-client.entity");
const web_user_entity_1 = require("../../entities/web-user.entity");
const tools_service_1 = require("../tools/tools.service");
const CREDIT_MAP = {
    announcement: { type: 'image', amount: 1 },
    product_sale: { type: 'image', amount: 1 },
    from_image: { type: 'image', amount: 1 },
    before_after: { type: 'image', amount: 1 },
    multi_mode: { type: 'image', amount: 1 },
    tips_carousel: { type: 'image', amount: 1 },
    video: { type: 'video', amount: 1 },
    ugc_video: { type: 'video', amount: 1 },
    reel: { type: 'video', amount: 1 },
    content_strategy: { type: 'text', amount: 1 },
};
let JobsService = class JobsService {
    constructor(jobRepo, productRepo, deletedRepo, editRepo, wucRepo, userRepo, tools) {
        this.jobRepo = jobRepo;
        this.productRepo = productRepo;
        this.deletedRepo = deletedRepo;
        this.editRepo = editRepo;
        this.wucRepo = wucRepo;
        this.userRepo = userRepo;
        this.tools = tools;
    }
    async list(clientId, userId) {
        const deleted = await this.deletedRepo.find({
            where: { client_id: clientId, web_user_id: userId },
            select: ['job_id'],
        });
        const deletedIds = deleted.map((d) => d.job_id);
        const jobs = await this.jobRepo.find({
            where: {
                client_id: clientId,
                ...(deletedIds.length ? { id: (0, typeorm_2.Not)((0, typeorm_2.In)(deletedIds)) } : {}),
            },
            order: { created_at: 'DESC' },
        });
        return Promise.all(jobs.map(async (job) => {
            const latestEdit = await this.editRepo.findOne({
                where: { job_id: job.id },
                order: { requested_at: 'DESC' },
            });
            return { ...job, edit_status: latestEdit?.status ?? null };
        }));
    }
    async create(dto, userId) {
        const { client_id, job_type, products, ...rest } = dto;
        await this.ensureClientOwner(client_id, userId);
        const creditInfo = CREDIT_MAP[job_type];
        if (creditInfo)
            await this.deductCredits(userId, creditInfo.type, creditInfo.amount);
        const initialStage = job_type === 'multi_mode' ? 'await_user_input' : 'generate_design';
        const job = this.jobRepo.create({
            client_id,
            job_type,
            current_stage: initialStage,
            language: rest.language || 'en',
            image_size: rest.image_size || 'post',
            user_message: rest.user_message,
            user_images: rest.user_images,
            media_type: ['video', 'ugc_video', 'reel'].includes(job_type) ? 'video' : 'image',
            credits_cost: 1,
        });
        await this.jobRepo.save(job);
        if (job_type === 'multi_mode' && products?.length) {
            for (let i = 0; i < products.length; i++) {
                await this.productRepo.save(this.productRepo.create({ job_id: job.id, sort_order: i, ...products[i] }));
            }
        }
        if (initialStage !== 'await_user_input') {
            this.tools.dispatchJob(job.id).catch(() => { });
        }
        return job;
    }
    async cancel(jobId, userId) {
        const job = await this.getJobForUser(jobId, userId);
        job.current_stage = 'rejected';
        return this.jobRepo.save(job);
    }
    async reset(jobId, userId) {
        const job = await this.getJobForUser(jobId, userId);
        job.current_stage = 'await_user_input';
        job.design_variations = [];
        job.ad_copy = '';
        return this.jobRepo.save(job);
    }
    async retryVideo(jobId, userId) {
        const job = await this.getJobForUser(jobId, userId);
        job.current_stage = 'generate_video';
        await this.jobRepo.save(job);
        this.tools.dispatchJob(job.id).catch(() => { });
        return job;
    }
    async softDelete(jobId, userId) {
        const job = await this.getJobForUser(jobId, userId);
        const del = this.deletedRepo.create({ job_id: job.id, web_user_id: userId, client_id: job.client_id });
        await this.deletedRepo.save(del);
        return { success: true };
    }
    async submitEditRequest(jobId, userId, userEdit, imageUrl, editMode) {
        const job = await this.getJobForUser(jobId, userId);
        await this.editRepo.update({ job_id: jobId, status: 'pending' }, { status: 'superseded' });
        const req = this.editRepo.create({ job_id: jobId, client_id: job.client_id, user_edit: userEdit });
        await this.editRepo.save(req);
        job.current_stage = 'generate_design';
        await this.jobRepo.save(job);
        this.tools.dispatchEditDesign(jobId, req.id, userEdit, imageUrl, editMode).catch(() => { });
        return { success: true };
    }
    async getEditHistory(jobId, userId) {
        await this.getJobForUser(jobId, userId);
        return this.editRepo.find({ where: { job_id: jobId }, order: { requested_at: 'DESC' } });
    }
    async getJobForUser(jobId, userId) {
        const job = await this.jobRepo.findOne({ where: { id: jobId } });
        if (!job)
            throw new common_1.NotFoundException('Job not found');
        await this.ensureClientOwner(job.client_id, userId);
        return job;
    }
    async ensureClientOwner(clientId, userId) {
        const link = await this.wucRepo.findOne({ where: { client_id: clientId, web_user_id: userId } });
        if (!link)
            throw new common_1.NotFoundException('Brand not found or not yours');
    }
    async deductCredits(userId, type, amount) {
        const col = `${type}_credits_remaining`;
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || user[col] < amount)
            throw new common_1.BadRequestException('Insufficient credits');
        await this.userRepo.decrement({ id: userId }, col, amount);
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(creative_job_entity_1.CreativeJob)),
    __param(1, (0, typeorm_1.InjectRepository)(web_multi_product_entity_1.WebMultiProduct)),
    __param(2, (0, typeorm_1.InjectRepository)(web_deleted_job_entity_1.WebDeletedJob)),
    __param(3, (0, typeorm_1.InjectRepository)(web_design_edit_request_entity_1.WebDesignEditRequest)),
    __param(4, (0, typeorm_1.InjectRepository)(web_user_client_entity_1.WebUserClient)),
    __param(5, (0, typeorm_1.InjectRepository)(web_user_entity_1.WebUser)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        tools_service_1.ToolsService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map