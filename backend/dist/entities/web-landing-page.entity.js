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
exports.WebLandingPage = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("./client.entity");
const web_landing_page_lead_entity_1 = require("./web-landing-page-lead.entity");
const web_landing_page_edit_entity_1 = require("./web-landing-page-edit.entity");
let WebLandingPage = class WebLandingPage {
};
exports.WebLandingPage = WebLandingPage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebLandingPage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebLandingPage.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, (c) => c.landingPages, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], WebLandingPage.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], WebLandingPage.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WebLandingPage.prototype, "user_prompt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], WebLandingPage.prototype, "user_images", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WebLandingPage.prototype, "html", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'draft' }),
    __metadata("design:type", String)
], WebLandingPage.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true, length: 255 }),
    __metadata("design:type", String)
], WebLandingPage.prototype, "public_slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WebLandingPage.prototype, "error_message", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebLandingPage.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WebLandingPage.prototype, "updated_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => web_landing_page_lead_entity_1.WebLandingPageLead, (l) => l.landingPage),
    __metadata("design:type", Array)
], WebLandingPage.prototype, "leads", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => web_landing_page_edit_entity_1.WebLandingPageEdit, (e) => e.landingPage),
    __metadata("design:type", Array)
], WebLandingPage.prototype, "edits", void 0);
exports.WebLandingPage = WebLandingPage = __decorate([
    (0, typeorm_1.Entity)('web_landing_pages')
], WebLandingPage);
//# sourceMappingURL=web-landing-page.entity.js.map