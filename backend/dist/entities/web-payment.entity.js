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
exports.WebPayment = void 0;
const typeorm_1 = require("typeorm");
const web_user_entity_1 = require("./web-user.entity");
let WebPayment = class WebPayment {
};
exports.WebPayment = WebPayment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebPayment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebPayment.prototype, "web_user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => web_user_entity_1.WebUser, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'web_user_id' }),
    __metadata("design:type", web_user_entity_1.WebUser)
], WebPayment.prototype, "webUser", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], WebPayment.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], WebPayment.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'ILS', length: 10 }),
    __metadata("design:type", String)
], WebPayment.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pending' }),
    __metadata("design:type", String)
], WebPayment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], WebPayment.prototype, "reference", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebPayment.prototype, "created_at", void 0);
exports.WebPayment = WebPayment = __decorate([
    (0, typeorm_1.Entity)('web_payments')
], WebPayment);
//# sourceMappingURL=web-payment.entity.js.map