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
exports.OnboardingController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const api_key_guard_1 = require("../../common/guards/api-key.guard");
const whatsapp_service_1 = require("./whatsapp.service");
const client_entity_1 = require("../../entities/client.entity");
let OnboardingController = class OnboardingController {
    constructor(whatsapp, clientRepo) {
        this.whatsapp = whatsapp;
        this.clientRepo = clientRepo;
    }
    async handle(body) {
        const clientId = parseInt(body.client_id);
        const step = body.step;
        if (!clientId)
            throw new common_1.BadRequestException('client_id required');
        const client = await this.clientRepo.findOne({ where: { id: clientId } });
        if (!client)
            throw new common_1.NotFoundException('Client not found');
        switch (step) {
            case 'logo_uploaded': {
                const logoUrl = body.logo_url;
                const logoFilename = body.logo_filename ?? `logo_${clientId}.png`;
                if (!logoUrl)
                    throw new common_1.BadRequestException('logo_url required');
                return this.whatsapp.onboardingLogoUploaded(clientId, logoUrl, logoFilename);
            }
            case 'logo_analyzed': {
                const primaryColor = body.primary_color;
                const secondaryColor = body.secondary_color;
                if (!primaryColor || !secondaryColor)
                    throw new common_1.BadRequestException('primary_color and secondary_color required');
                return this.whatsapp.onboardingLogoAnalyzed(clientId, primaryColor, secondaryColor);
            }
            case 'business_described': {
                const description = body.business_description;
                if (!description)
                    throw new common_1.BadRequestException('business_description required');
                return this.whatsapp.onboardingBusinessDescribed(clientId, description);
            }
            case 'profile_inferred': {
                const profile = body.brand_profile;
                if (!profile)
                    throw new common_1.BadRequestException('brand_profile required');
                return this.whatsapp.onboardingProfileInferred(clientId, profile);
            }
            default:
                throw new common_1.BadRequestException(`Invalid step: ${step}`);
        }
    }
};
exports.OnboardingController = OnboardingController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "handle", null);
exports.OnboardingController = OnboardingController = __decorate([
    (0, common_1.Controller)('onboarding'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __param(1, (0, typeorm_1.InjectRepository)(client_entity_1.Client)),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService,
        typeorm_2.Repository])
], OnboardingController);
//# sourceMappingURL=onboarding.controller.js.map