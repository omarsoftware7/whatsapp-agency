"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const typeorm_1 = require("typeorm");
const creative_job_entity_1 = require("./creative-job.entity");
const web_user_client_entity_1 = require("./web-user-client.entity");
const web_brand_profile_entity_1 = require("./web-brand-profile.entity");
const web_landing_page_entity_1 = require("./web-landing-page.entity");
const web_business_card_entity_1 = require("./web-business-card.entity");
let Client = class Client {
    get logo_url() {
        return this.logo_filename ? `/uploads/logos/${this.logo_filename}` : null;
    }
};
exports.Client = Client;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Client.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 20 }),
    __metadata("design:type", String)
], Client.prototype, "phone_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "whatsapp_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "business_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "business_description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], Client.prototype, "logo_filename", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 7 }),
    __metadata("design:type", String)
], Client.prototype, "primary_color", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 7 }),
    __metadata("design:type", String)
], Client.prototype, "secondary_color", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 50 }),
    __metadata("design:type", String)
], Client.prototype, "font_preference", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 20 }),
    __metadata("design:type", String)
], Client.prototype, "brand_tone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 5, default: 'en' }),
    __metadata("design:type", String)
], Client.prototype, "default_language", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], Client.prototype, "industry", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 50 }),
    __metadata("design:type", String)
], Client.prototype, "business_phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "business_address", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'trial' }),
    __metadata("design:type", String)
], Client.prototype, "subscription_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 5 }),
    __metadata("design:type", Number)
], Client.prototype, "trial_credits", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Client.prototype, "monthly_credits", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Client.prototype, "content_posts_this_week", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true }),
    __metadata("design:type", Date)
], Client.prototype, "content_week_reset_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Client.prototype, "onboarding_complete", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'upload_logo', length: 50 }),
    __metadata("design:type", String)
], Client.prototype, "onboarding_step", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "meta_page_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "meta_page_token", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Client.prototype, "meta_page_token_expires", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Client.prototype, "instagram_account_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Client.prototype, "meta_tokens_valid", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Client.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Client.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Client.prototype, "last_activity_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => creative_job_entity_1.CreativeJob, (job) => job.client),
    __metadata("design:type", Array)
], Client.prototype, "jobs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => web_user_client_entity_1.WebUserClient, (wuc) => wuc.client),
    __metadata("design:type", Array)
], Client.prototype, "userLinks", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => web_brand_profile_entity_1.WebBrandProfile, (bp) => bp.client),
    __metadata("design:type", web_brand_profile_entity_1.WebBrandProfile)
], Client.prototype, "brandProfile", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => web_landing_page_entity_1.WebLandingPage, (lp) => lp.client),
    __metadata("design:type", Array)
], Client.prototype, "landingPages", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => web_business_card_entity_1.WebBusinessCard, (bc) => bc.client),
    __metadata("design:type", web_business_card_entity_1.WebBusinessCard)
], Client.prototype, "businessCard", void 0);
exports.Client = Client = __decorate([
    (0, typeorm_1.Entity)('clients')
], Client);
//# sourceMappingURL=client.entity.js.map