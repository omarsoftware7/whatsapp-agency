"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const profile_controller_1 = require("./profile.controller");
const profile_service_1 = require("./profile.service");
const web_user_entity_1 = require("../../entities/web-user.entity");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const activity_log_entity_1 = require("../../entities/activity-log.entity");
const web_landing_page_entity_1 = require("../../entities/web-landing-page.entity");
const web_business_card_entity_1 = require("../../entities/web-business-card.entity");
const web_referral_entity_1 = require("../../entities/web-referral.entity");
const web_user_client_entity_1 = require("../../entities/web-user-client.entity");
let ProfileModule = class ProfileModule {
};
exports.ProfileModule = ProfileModule;
exports.ProfileModule = ProfileModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_user_entity_1.WebUser, creative_job_entity_1.CreativeJob, activity_log_entity_1.ActivityLog, web_landing_page_entity_1.WebLandingPage, web_business_card_entity_1.WebBusinessCard, web_referral_entity_1.WebReferral, web_user_client_entity_1.WebUserClient])],
        controllers: [profile_controller_1.ProfileController],
        providers: [profile_service_1.ProfileService],
    })
], ProfileModule);
//# sourceMappingURL=profile.module.js.map