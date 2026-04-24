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
exports.BusinessCardsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto_1 = require("crypto");
const web_business_card_entity_1 = require("../../entities/web-business-card.entity");
let BusinessCardsService = class BusinessCardsService {
    constructor(cardRepo) {
        this.cardRepo = cardRepo;
    }
    async getForClient(clientId) {
        return this.cardRepo.findOne({ where: { client_id: clientId } });
    }
    async save(clientId, dto) {
        let card = await this.cardRepo.findOne({ where: { client_id: clientId } });
        if (!card) {
            card = this.cardRepo.create({ client_id: clientId, public_slug: (0, crypto_1.randomBytes)(8).toString('hex') });
        }
        Object.assign(card, dto);
        return this.cardRepo.save(card);
    }
    async getBySlug(slug) {
        return this.cardRepo.findOne({ where: { public_slug: slug }, relations: ['client'] });
    }
    async listAll() {
        return this.cardRepo.find({ relations: ['client'], order: { created_at: 'DESC' } });
    }
};
exports.BusinessCardsService = BusinessCardsService;
exports.BusinessCardsService = BusinessCardsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(web_business_card_entity_1.WebBusinessCard)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], BusinessCardsService);
//# sourceMappingURL=business-cards.service.js.map