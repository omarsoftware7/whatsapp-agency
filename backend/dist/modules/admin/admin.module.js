"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const admin_users_controller_1 = require("./admin-users.controller");
const admin_brands_controller_1 = require("./admin-brands.controller");
const admin_metrics_controller_1 = require("./admin-metrics.controller");
const admin_jobs_controller_1 = require("./admin-jobs.controller");
const admin_landing_pages_controller_1 = require("./admin-landing-pages.controller");
const admin_service_1 = require("./admin.service");
const web_user_entity_1 = require("../../entities/web-user.entity");
const client_entity_1 = require("../../entities/client.entity");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_landing_page_entity_1 = require("../../entities/web-landing-page.entity");
const web_payment_entity_1 = require("../../entities/web-payment.entity");
const web_referral_entity_1 = require("../../entities/web-referral.entity");
const activity_log_entity_1 = require("../../entities/activity-log.entity");
const web_user_client_entity_1 = require("../../entities/web-user-client.entity");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_user_entity_1.WebUser, client_entity_1.Client, creative_job_entity_1.CreativeJob, web_landing_page_entity_1.WebLandingPage, web_payment_entity_1.WebPayment, web_referral_entity_1.WebReferral, activity_log_entity_1.ActivityLog, web_user_client_entity_1.WebUserClient])],
        controllers: [admin_users_controller_1.AdminUsersController, admin_brands_controller_1.AdminBrandsController, admin_metrics_controller_1.AdminMetricsController, admin_jobs_controller_1.AdminJobsController, admin_landing_pages_controller_1.AdminLandingPagesController],
        providers: [admin_service_1.AdminService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map