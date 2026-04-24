"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const tools_service_1 = require("./tools.service");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_multi_product_entity_1 = require("../../entities/web-multi-product.entity");
const web_design_edit_request_entity_1 = require("../../entities/web-design-edit-request.entity");
const web_landing_page_entity_1 = require("../../entities/web-landing-page.entity");
const web_user_entity_1 = require("../../entities/web-user.entity");
const web_user_client_entity_1 = require("../../entities/web-user-client.entity");
const client_entity_1 = require("../../entities/client.entity");
const ai_module_1 = require("../ai/ai.module");
let ToolsModule = class ToolsModule {
};
exports.ToolsModule = ToolsModule;
exports.ToolsModule = ToolsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([creative_job_entity_1.CreativeJob, web_multi_product_entity_1.WebMultiProduct, web_design_edit_request_entity_1.WebDesignEditRequest, web_landing_page_entity_1.WebLandingPage, web_user_entity_1.WebUser, web_user_client_entity_1.WebUserClient, client_entity_1.Client]),
            ai_module_1.AiModule,
        ],
        providers: [tools_service_1.ToolsService],
        exports: [tools_service_1.ToolsService],
    })
], ToolsModule);
//# sourceMappingURL=tools.module.js.map