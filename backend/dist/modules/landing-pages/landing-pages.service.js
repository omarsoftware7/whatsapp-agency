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
exports.LandingPagesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const web_landing_page_entity_1 = require("../../entities/web-landing-page.entity");
const web_landing_page_lead_entity_1 = require("../../entities/web-landing-page-lead.entity");
const web_deleted_landing_page_entity_1 = require("../../entities/web-deleted-landing-page.entity");
const web_user_entity_1 = require("../../entities/web-user.entity");
const tools_service_1 = require("../tools/tools.service");
let LandingPagesService = class LandingPagesService {
    constructor(pageRepo, leadRepo, deletedRepo, userRepo, tools) {
        this.pageRepo = pageRepo;
        this.leadRepo = leadRepo;
        this.deletedRepo = deletedRepo;
        this.userRepo = userRepo;
        this.tools = tools;
    }
    async list(clientId, userId) {
        const deleted = await this.deletedRepo.find({ where: { web_user_id: userId }, select: ['landing_page_id'] });
        const deletedIds = deleted.map((d) => d.landing_page_id);
        return this.pageRepo.find({
            where: { client_id: clientId, ...(deletedIds.length ? { id: (0, typeorm_2.Not)((0, typeorm_2.In)(deletedIds)) } : {}) },
            order: { created_at: 'DESC' },
        });
    }
    async create(clientId, userId, userPrompt, userImages) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || user.landing_credits_remaining < 1) {
            throw new common_1.BadRequestException('Insufficient landing page credits');
        }
        await this.userRepo.decrement({ id: userId }, 'landing_credits_remaining', 1);
        const slug = (0, crypto_1.randomBytes)(8).toString('hex');
        const page = await this.pageRepo.save(this.pageRepo.create({ client_id: clientId, user_prompt: userPrompt, user_images: userImages, status: 'generating', public_slug: slug }));
        this.tools.dispatchGenerateLandingPage(page.id).catch(() => { });
        return page;
    }
    async softDelete(pageId, userId) {
        const page = await this.pageRepo.findOne({ where: { id: pageId } });
        if (!page)
            throw new common_1.NotFoundException('Landing page not found');
        await this.deletedRepo.save(this.deletedRepo.create({ landing_page_id: pageId, web_user_id: userId }));
        return { success: true };
    }
    async getBySlug(slug) {
        const page = await this.pageRepo.findOne({ where: { public_slug: slug } });
        if (!page)
            throw new common_1.NotFoundException('Landing page not found');
        return page;
    }
    async submitLead(landingPageId, clientId, data) {
        return this.leadRepo.save(this.leadRepo.create({ landing_page_id: landingPageId, client_id: clientId, ...data }));
    }
};
exports.LandingPagesService = LandingPagesService;
exports.LandingPagesService = LandingPagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(web_landing_page_entity_1.WebLandingPage)),
    __param(1, (0, typeorm_1.InjectRepository)(web_landing_page_lead_entity_1.WebLandingPageLead)),
    __param(2, (0, typeorm_1.InjectRepository)(web_deleted_landing_page_entity_1.WebDeletedLandingPage)),
    __param(3, (0, typeorm_1.InjectRepository)(web_user_entity_1.WebUser)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        tools_service_1.ToolsService])
], LandingPagesService);
//# sourceMappingURL=landing-pages.service.js.map