"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentPlansModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const content_plans_controller_1 = require("./content-plans.controller");
const content_plans_service_1 = require("./content-plans.service");
const web_content_plan_entity_1 = require("../../entities/web-content-plan.entity");
const web_content_plan_item_entity_1 = require("../../entities/web-content-plan-item.entity");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_user_entity_1 = require("../../entities/web-user.entity");
const ai_module_1 = require("../ai/ai.module");
const tools_module_1 = require("../tools/tools.module");
let ContentPlansModule = class ContentPlansModule {
};
exports.ContentPlansModule = ContentPlansModule;
exports.ContentPlansModule = ContentPlansModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_content_plan_entity_1.WebContentPlan, web_content_plan_item_entity_1.WebContentPlanItem, creative_job_entity_1.CreativeJob, web_user_entity_1.WebUser]), ai_module_1.AiModule, tools_module_1.ToolsModule],
        controllers: [content_plans_controller_1.ContentPlansController],
        providers: [content_plans_service_1.ContentPlansService],
    })
], ContentPlansModule);
//# sourceMappingURL=content-plans.module.js.map