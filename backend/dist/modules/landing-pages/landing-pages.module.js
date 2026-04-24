"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LandingPagesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const landing_pages_controller_1 = require("./landing-pages.controller");
const public_landing_controller_1 = require("./public-landing.controller");
const landing_pages_service_1 = require("./landing-pages.service");
const web_landing_page_entity_1 = require("../../entities/web-landing-page.entity");
const web_landing_page_lead_entity_1 = require("../../entities/web-landing-page-lead.entity");
const web_landing_page_edit_entity_1 = require("../../entities/web-landing-page-edit.entity");
const web_deleted_landing_page_entity_1 = require("../../entities/web-deleted-landing-page.entity");
const web_user_entity_1 = require("../../entities/web-user.entity");
const tools_module_1 = require("../tools/tools.module");
let LandingPagesModule = class LandingPagesModule {
};
exports.LandingPagesModule = LandingPagesModule;
exports.LandingPagesModule = LandingPagesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_landing_page_entity_1.WebLandingPage, web_landing_page_lead_entity_1.WebLandingPageLead, web_landing_page_edit_entity_1.WebLandingPageEdit, web_deleted_landing_page_entity_1.WebDeletedLandingPage, web_user_entity_1.WebUser]), tools_module_1.ToolsModule],
        controllers: [landing_pages_controller_1.LandingPagesController, public_landing_controller_1.PublicLandingController],
        providers: [landing_pages_service_1.LandingPagesService],
        exports: [landing_pages_service_1.LandingPagesService],
    })
], LandingPagesModule);
//# sourceMappingURL=landing-pages.module.js.map