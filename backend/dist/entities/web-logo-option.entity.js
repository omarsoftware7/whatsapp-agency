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
exports.WebLogoOption = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("./client.entity");
let WebLogoOption = class WebLogoOption {
};
exports.WebLogoOption = WebLogoOption;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebLogoOption.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebLogoOption.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], WebLogoOption.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], WebLogoOption.prototype, "batch_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 500 }),
    __metadata("design:type", String)
], WebLogoOption.prototype, "image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WebLogoOption.prototype, "prompt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'option' }),
    __metadata("design:type", String)
], WebLogoOption.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebLogoOption.prototype, "created_at", void 0);
exports.WebLogoOption = WebLogoOption = __decorate([
    (0, typeorm_1.Entity)('web_logo_options')
], WebLogoOption);
//# sourceMappingURL=web-logo-option.entity.js.map