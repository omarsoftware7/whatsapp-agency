"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const schedule_1 = require("@nestjs/schedule");
const auth_module_1 = require("./modules/auth/auth.module");
const brands_module_1 = require("./modules/brands/brands.module");
const jobs_module_1 = require("./modules/jobs/jobs.module");
const content_plans_module_1 = require("./modules/content-plans/content-plans.module");
const landing_pages_module_1 = require("./modules/landing-pages/landing-pages.module");
const business_cards_module_1 = require("./modules/business-cards/business-cards.module");
const scheduled_posts_module_1 = require("./modules/scheduled-posts/scheduled-posts.module");
const library_module_1 = require("./modules/library/library.module");
const payments_module_1 = require("./modules/payments/payments.module");
const admin_module_1 = require("./modules/admin/admin.module");
const webhooks_module_1 = require("./modules/webhooks/webhooks.module");
const profile_module_1 = require("./modules/profile/profile.module");
const leads_module_1 = require("./modules/leads/leads.module");
const upload_module_1 = require("./modules/upload/upload.module");
const tools_module_1 = require("./modules/tools/tools.module");
const ai_module_1 = require("./modules/ai/ai.module");
const meta_module_1 = require("./modules/meta/meta.module");
const app_controller_1 = require("./app.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    type: 'postgres',
                    url: config.get('DATABASE_URL'),
                    ssl: config.get('NODE_ENV') === 'production'
                        ? { rejectUnauthorized: false }
                        : false,
                    autoLoadEntities: true,
                    synchronize: true,
                    logging: config.get('NODE_ENV') !== 'production',
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            brands_module_1.BrandsModule,
            jobs_module_1.JobsModule,
            content_plans_module_1.ContentPlansModule,
            landing_pages_module_1.LandingPagesModule,
            business_cards_module_1.BusinessCardsModule,
            scheduled_posts_module_1.ScheduledPostsModule,
            library_module_1.LibraryModule,
            payments_module_1.PaymentsModule,
            admin_module_1.AdminModule,
            webhooks_module_1.WebhooksModule,
            profile_module_1.ProfileModule,
            leads_module_1.LeadsModule,
            upload_module_1.UploadModule,
            tools_module_1.ToolsModule,
            ai_module_1.AiModule,
            meta_module_1.MetaModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map