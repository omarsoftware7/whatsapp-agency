"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledPostsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const scheduled_posts_controller_1 = require("./scheduled-posts.controller");
const scheduled_posts_service_1 = require("./scheduled-posts.service");
const web_scheduled_post_entity_1 = require("../../entities/web-scheduled-post.entity");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_brand_profile_entity_1 = require("../../entities/web-brand-profile.entity");
const meta_module_1 = require("../meta/meta.module");
let ScheduledPostsModule = class ScheduledPostsModule {
};
exports.ScheduledPostsModule = ScheduledPostsModule;
exports.ScheduledPostsModule = ScheduledPostsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_scheduled_post_entity_1.WebScheduledPost, creative_job_entity_1.CreativeJob, web_brand_profile_entity_1.WebBrandProfile]), meta_module_1.MetaModule],
        controllers: [scheduled_posts_controller_1.ScheduledPostsController],
        providers: [scheduled_posts_service_1.ScheduledPostsService],
    })
], ScheduledPostsModule);
//# sourceMappingURL=scheduled-posts.module.js.map