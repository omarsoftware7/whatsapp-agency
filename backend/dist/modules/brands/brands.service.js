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
exports.BrandsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const client_entity_1 = require("../../entities/client.entity");
const web_user_client_entity_1 = require("../../entities/web-user-client.entity");
const web_brand_profile_entity_1 = require("../../entities/web-brand-profile.entity");
const gemini_service_1 = require("../ai/gemini.service");
let BrandsService = class BrandsService {
    constructor(clientRepo, wucRepo, profileRepo, gemini) {
        this.clientRepo = clientRepo;
        this.wucRepo = wucRepo;
        this.profileRepo = profileRepo;
        this.gemini = gemini;
    }
    async listForUser(userId, role) {
        if (role === 'admin') {
            return this.clientRepo.find({ relations: ['brandProfile'], order: { created_at: 'DESC' } });
        }
        const links = await this.wucRepo.find({ where: { web_user_id: userId }, relations: ['client', 'client.brandProfile'] });
        return links.map((l) => l.client);
    }
    async getOne(clientId, userId, role) {
        const client = await this.clientRepo.findOne({ where: { id: clientId }, relations: ['brandProfile'] });
        if (!client)
            throw new common_1.NotFoundException('Brand not found');
        if (role !== 'admin')
            await this.ensureOwner(clientId, userId);
        return client;
    }
    async create(dto, userId) {
        const phone_number = `web${Date.now().toString(36)}`;
        const client = this.clientRepo.create({
            phone_number,
            business_name: dto.business_name,
            business_description: dto.description,
            default_language: dto.language || 'en',
            industry: dto.category,
            business_phone: dto.business_phone,
            business_address: dto.location,
        });
        await this.clientRepo.save(client);
        await this.wucRepo.save(this.wucRepo.create({ web_user_id: userId, client_id: client.id }));
        const profile = this.profileRepo.create({
            client_id: client.id,
            category: dto.category,
            website: dto.website,
            instagram_handle: dto.instagram_handle,
            target_audience: dto.target_audience,
            price_range: dto.price_range,
            country: dto.country || 'Israel',
            facebook_page_url: dto.facebook_page_url,
            instagram_page_url: dto.instagram_page_url,
            heard_about: dto.heard_about,
        });
        await this.profileRepo.save(profile);
        await this.inferBrandProfile(client, profile);
        return client;
    }
    async updateProfile(clientId, dto, userId, role) {
        const client = await this.getOne(clientId, userId, role);
        Object.assign(client, {
            business_name: dto.business_name ?? client.business_name,
            business_description: dto.description ?? client.business_description,
            industry: dto.category ?? client.industry,
        });
        await this.clientRepo.save(client);
        let profile = await this.profileRepo.findOne({ where: { client_id: clientId } });
        if (!profile) {
            profile = this.profileRepo.create({ client_id: clientId });
        }
        Object.assign(profile, {
            category: dto.category ?? profile.category,
            website: dto.website ?? profile.website,
            target_audience: dto.target_audience ?? profile.target_audience,
            price_range: dto.price_range ?? profile.price_range,
            country: dto.country ?? profile.country,
        });
        await this.profileRepo.save(profile);
        await this.inferBrandProfile(client, profile);
        return client;
    }
    async delete(clientId, userId, role) {
        if (role !== 'admin')
            await this.ensureOwner(clientId, userId);
        await this.clientRepo.delete(clientId);
    }
    async ensureOwner(clientId, userId) {
        const link = await this.wucRepo.findOne({ where: { client_id: clientId, web_user_id: userId } });
        if (!link)
            throw new common_1.ForbiddenException('Not your brand');
    }
    async inferBrandProfile(client, profile) {
        try {
            const prompt = `Given this business:\nName: ${client.business_name}\nDescription: ${client.business_description}\nCategory: ${profile.category}\nCountry: ${profile.country}\n\nSuggest: brand_tone (professional/playful/luxury/minimal/vibrant), font_preference, and a short target_audience description. Reply as JSON only.`;
            const result = await this.gemini.generateText(prompt);
            const json = JSON.parse(result.replace(/```json|```/g, '').trim());
            if (json.brand_tone)
                client.brand_tone = json.brand_tone;
            if (json.font_preference)
                client.font_preference = json.font_preference;
            if (json.target_audience)
                profile.target_audience = json.target_audience;
            await this.clientRepo.save(client);
            await this.profileRepo.save(profile);
        }
        catch { }
    }
};
exports.BrandsService = BrandsService;
exports.BrandsService = BrandsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __param(1, (0, typeorm_1.InjectRepository)(web_user_client_entity_1.WebUserClient)),
    __param(2, (0, typeorm_1.InjectRepository)(web_brand_profile_entity_1.WebBrandProfile)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        gemini_service_1.GeminiService])
], BrandsService);
//# sourceMappingURL=brands.service.js.map