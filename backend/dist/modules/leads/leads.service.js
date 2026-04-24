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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const web_landing_page_lead_entity_1 = require("../../entities/web-landing-page-lead.entity");
const web_manual_lead_entity_1 = require("../../entities/web-manual-lead.entity");
let LeadsService = class LeadsService {
    constructor(leadRepo, manualLeadRepo) {
        this.leadRepo = leadRepo;
        this.manualLeadRepo = manualLeadRepo;
    }
    async listForClient(clientId) {
        return this.leadRepo.find({ where: { client_id: clientId }, order: { created_at: 'DESC' } });
    }
    async listManualForClient(clientId, userId) {
        return this.manualLeadRepo.find({ where: { client_id: clientId, web_user_id: userId }, order: { imported_at: 'DESC' } });
    }
    async importCsv(clientId, userId, rows) {
        const toSave = rows.slice(0, 500).map((r) => this.manualLeadRepo.create({ client_id: clientId, web_user_id: userId, ...r }));
        await this.manualLeadRepo.save(toSave);
        return { imported: toSave.length };
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(web_landing_page_lead_entity_1.WebLandingPageLead)),
    __param(1, (0, typeorm_1.InjectRepository)(web_manual_lead_entity_1.WebManualLead)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LeadsService);
//# sourceMappingURL=leads.service.js.map