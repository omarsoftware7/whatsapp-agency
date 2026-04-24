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
exports.WebReferralCode = void 0;
const typeorm_1 = require("typeorm");
const web_user_entity_1 = require("./web-user.entity");
let WebReferralCode = class WebReferralCode {
};
exports.WebReferralCode = WebReferralCode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebReferralCode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", Number)
], WebReferralCode.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => web_user_entity_1.WebUser),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", web_user_entity_1.WebUser)
], WebReferralCode.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 32 }),
    __metadata("design:type", String)
], WebReferralCode.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebReferralCode.prototype, "created_at", void 0);
exports.WebReferralCode = WebReferralCode = __decorate([
    (0, typeorm_1.Entity)('web_referral_codes')
], WebReferralCode);
//# sourceMappingURL=web-referral-code.entity.js.map