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
exports.WebReferral = void 0;
const typeorm_1 = require("typeorm");
const web_user_entity_1 = require("./web-user.entity");
let WebReferral = class WebReferral {
};
exports.WebReferral = WebReferral;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebReferral.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebReferral.prototype, "referrer_user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", Number)
], WebReferral.prototype, "referred_user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 32 }),
    __metadata("design:type", String)
], WebReferral.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pending', length: 16 }),
    __metadata("design:type", String)
], WebReferral.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], WebReferral.prototype, "discount_applied", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], WebReferral.prototype, "rewarded_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => web_user_entity_1.WebUser, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'referrer_user_id' }),
    __metadata("design:type", web_user_entity_1.WebUser)
], WebReferral.prototype, "referrer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => web_user_entity_1.WebUser, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'referred_user_id' }),
    __metadata("design:type", web_user_entity_1.WebUser)
], WebReferral.prototype, "referred", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebReferral.prototype, "created_at", void 0);
exports.WebReferral = WebReferral = __decorate([
    (0, typeorm_1.Entity)('web_referrals'),
    (0, typeorm_1.Unique)(['referred_user_id'])
], WebReferral);
//# sourceMappingURL=web-referral.entity.js.map