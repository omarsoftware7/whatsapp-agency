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
exports.WebDeletedLandingPage = void 0;
const typeorm_1 = require("typeorm");
const web_user_entity_1 = require("./web-user.entity");
const web_landing_page_entity_1 = require("./web-landing-page.entity");
let WebDeletedLandingPage = class WebDeletedLandingPage {
};
exports.WebDeletedLandingPage = WebDeletedLandingPage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebDeletedLandingPage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebDeletedLandingPage.prototype, "landing_page_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebDeletedLandingPage.prototype, "web_user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => web_landing_page_entity_1.WebLandingPage, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'landing_page_id' }),
    __metadata("design:type", web_landing_page_entity_1.WebLandingPage)
], WebDeletedLandingPage.prototype, "landingPage", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => web_user_entity_1.WebUser, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'web_user_id' }),
    __metadata("design:type", web_user_entity_1.WebUser)
], WebDeletedLandingPage.prototype, "webUser", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebDeletedLandingPage.prototype, "deleted_at", void 0);
exports.WebDeletedLandingPage = WebDeletedLandingPage = __decorate([
    (0, typeorm_1.Entity)('web_deleted_landing_pages'),
    (0, typeorm_1.Unique)(['web_user_id', 'landing_page_id'])
], WebDeletedLandingPage);
//# sourceMappingURL=web-deleted-landing-page.entity.js.map