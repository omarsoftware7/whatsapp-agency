"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const whatsapp_controller_1 = require("./whatsapp.controller");
const jobs_controller_1 = require("./jobs.controller");
const onboarding_controller_1 = require("./onboarding.controller");
const publish_controller_1 = require("./publish.controller");
const n8n_meta_oauth_controller_1 = require("./n8n-meta-oauth.controller");
const whatsapp_media_controller_1 = require("./whatsapp-media.controller");
const client_info_controller_1 = require("./client-info.controller");
const files_controller_1 = require("./files.controller");
const whatsapp_service_1 = require("./whatsapp.service");
const api_key_guard_1 = require("../../common/guards/api-key.guard");
const client_entity_1 = require("../../entities/client.entity");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const activity_log_entity_1 = require("../../entities/activity-log.entity");
const api_key_entity_1 = require("../../entities/api-key.entity");
let WebhooksModule = class WebhooksModule {
};
exports.WebhooksModule = WebhooksModule;
exports.WebhooksModule = WebhooksModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([client_entity_1.Client, creative_job_entity_1.CreativeJob, activity_log_entity_1.ActivityLog, api_key_entity_1.ApiKey])],
        controllers: [
            whatsapp_controller_1.WhatsappController,
            jobs_controller_1.JobsController,
            onboarding_controller_1.OnboardingController,
            publish_controller_1.PublishController,
            n8n_meta_oauth_controller_1.N8nMetaOAuthController,
            n8n_meta_oauth_controller_1.MetaOAuthCompleteController,
            whatsapp_media_controller_1.WhatsappMediaController,
            client_info_controller_1.ClientInfoController,
            files_controller_1.FilesController,
        ],
        providers: [whatsapp_service_1.WhatsappService, api_key_guard_1.ApiKeyGuard],
        exports: [whatsapp_service_1.WhatsappService],
    })
], WebhooksModule);
//# sourceMappingURL=webhooks.module.js.map