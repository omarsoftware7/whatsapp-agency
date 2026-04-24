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
exports.WebLandingPageLead = void 0;
const typeorm_1 = require("typeorm");
const web_landing_page_entity_1 = require("./web-landing-page.entity");
const client_entity_1 = require("./client.entity");
let WebLandingPageLead = class WebLandingPageLead {
};
exports.WebLandingPageLead = WebLandingPageLead;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebLandingPageLead.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebLandingPageLead.prototype, "landing_page_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebLandingPageLead.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => web_landing_page_entity_1.WebLandingPage, (lp) => lp.leads, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'landing_page_id' }),
    __metadata("design:type", web_landing_page_entity_1.WebLandingPage)
], WebLandingPageLead.prototype, "landingPage", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], WebLandingPageLead.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebLandingPageLead.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebLandingPageLead.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebLandingPageLead.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebLandingPageLead.prototype, "source_url", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebLandingPageLead.prototype, "created_at", void 0);
exports.WebLandingPageLead = WebLandingPageLead = __decorate([
    (0, typeorm_1.Entity)('web_landing_page_leads')
], WebLandingPageLead);
//# sourceMappingURL=web-landing-page-lead.entity.js.map