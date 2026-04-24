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
exports.ContentPlansService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const web_content_plan_entity_1 = require("../../entities/web-content-plan.entity");
const web_content_plan_item_entity_1 = require("../../entities/web-content-plan-item.entity");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_user_entity_1 = require("../../entities/web-user.entity");
const gemini_service_1 = require("../ai/gemini.service");
const tools_service_1 = require("../tools/tools.service");
let ContentPlansService = class ContentPlansService {
    constructor(planRepo, itemRepo, jobRepo, userRepo, gemini, tools) {
        this.planRepo = planRepo;
        this.itemRepo = itemRepo;
        this.jobRepo = jobRepo;
        this.userRepo = userRepo;
        this.gemini = gemini;
        this.tools = tools;
    }
    async getLatest(clientId, userId) {
        const plan = await this.planRepo.findOne({
            where: { client_id: clientId, web_user_id: userId },
            order: { created_at: 'DESC' },
            relations: ['items'],
        });
        return plan;
    }
    async generate(clientId, userId, mode, userPrompt) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || user.text_credits_remaining < 4) {
            throw new common_1.BadRequestException('Insufficient text credits (4 required)');
        }
        await this.userRepo.decrement({ id: userId }, 'text_credits_remaining', 4);
        const prompt = `Generate a monthly social media content plan with exactly 4 post ideas for this business.
${userPrompt ? `User request: ${userPrompt}` : ''}
Return ONLY a valid JSON array of 4 objects with: title (string), idea_text (string), job_type (one of: announcement, product_sale, from_image, before_after).
Example: [{"title":"...","idea_text":"...","job_type":"announcement"}]`;
        const raw = await this.gemini.generateText(prompt, 1024, 0.8);
        const items = JSON.parse(raw.replace(/```json|```/g, '').trim());
        const plan = await this.planRepo.save(this.planRepo.create({ client_id: clientId, web_user_id: userId, mode, user_prompt: userPrompt }));
        await this.itemRepo.update({ client_id: clientId }, { status: 'superseded' });
        for (const item of items.slice(0, 4)) {
            await this.itemRepo.save(this.itemRepo.create({
                plan_id: plan.id,
                client_id: clientId,
                title: item.title,
                idea_text: item.idea_text,
                job_type: item.job_type,
                status: 'draft',
            }));
        }
        return this.planRepo.findOne({ where: { id: plan.id }, relations: ['items'] });
    }
    async updateItem(itemId, title, ideaText) {
        await this.itemRepo.update(itemId, { title, idea_text: ideaText });
        return this.itemRepo.findOne({ where: { id: itemId } });
    }
    async approveItem(itemId) {
        await this.itemRepo.update(itemId, { status: 'approved' });
        return this.itemRepo.findOne({ where: { id: itemId } });
    }
    async createJobFromItem(itemId, userId, imageSize, language) {
        const item = await this.itemRepo.findOne({ where: { id: itemId } });
        if (!item)
            throw new common_1.BadRequestException('Item not found');
        const job = await this.jobRepo.save(this.jobRepo.create({
            client_id: item.client_id,
            job_type: item.job_type,
            user_message: item.idea_text,
            image_size: imageSize,
            language,
            current_stage: 'generate_design',
        }));
        await this.itemRepo.update(itemId, { status: 'created', job_id: job.id });
        this.tools.dispatchJob(job.id).catch(() => { });
        return job;
    }
};
exports.ContentPlansService = ContentPlansService;
exports.ContentPlansService = ContentPlansService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(web_content_plan_entity_1.WebContentPlan)),
    __param(1, (0, typeorm_1.InjectRepository)(web_content_plan_item_entity_1.WebContentPlanItem)),
    __param(2, (0, typeorm_1.InjectRepository)(creative_job_entity_1.CreativeJob)),
    __param(3, (0, typeorm_1.InjectRepository)(web_user_entity_1.WebUser)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        gemini_service_1.GeminiService,
        tools_service_1.ToolsService])
], ContentPlansService);
//# sourceMappingURL=content-plans.service.js.map