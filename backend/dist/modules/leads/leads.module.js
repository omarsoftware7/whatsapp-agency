"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const leads_controller_1 = require("./leads.controller");
const leads_service_1 = require("./leads.service");
const web_landing_page_lead_entity_1 = require("../../entities/web-landing-page-lead.entity");
const web_manual_lead_entity_1 = require("../../entities/web-manual-lead.entity");
let LeadsModule = class LeadsModule {
};
exports.LeadsModule = LeadsModule;
exports.LeadsModule = LeadsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_landing_page_lead_entity_1.WebLandingPageLead, web_manual_lead_entity_1.WebManualLead])],
        controllers: [leads_controller_1.LeadsController],
        providers: [leads_service_1.LeadsService],
    })
], LeadsModule);
//# sourceMappingURL=leads.module.js.map