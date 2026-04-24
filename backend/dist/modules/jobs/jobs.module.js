"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jobs_controller_1 = require("./jobs.controller");
const jobs_service_1 = require("./jobs.service");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_multi_product_entity_1 = require("../../entities/web-multi-product.entity");
const web_deleted_job_entity_1 = require("../../entities/web-deleted-job.entity");
const web_design_edit_request_entity_1 = require("../../entities/web-design-edit-request.entity");
const web_user_client_entity_1 = require("../../entities/web-user-client.entity");
const web_user_entity_1 = require("../../entities/web-user.entity");
const tools_module_1 = require("../tools/tools.module");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([creative_job_entity_1.CreativeJob, web_multi_product_entity_1.WebMultiProduct, web_deleted_job_entity_1.WebDeletedJob, web_design_edit_request_entity_1.WebDesignEditRequest, web_user_client_entity_1.WebUserClient, web_user_entity_1.WebUser]),
            tools_module_1.ToolsModule,
        ],
        controllers: [jobs_controller_1.JobsController],
        providers: [jobs_service_1.JobsService],
        exports: [jobs_service_1.JobsService],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map