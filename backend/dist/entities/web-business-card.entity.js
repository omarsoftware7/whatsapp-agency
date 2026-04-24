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
exports.WebBusinessCard = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("./client.entity");
let WebBusinessCard = class WebBusinessCard {
};
exports.WebBusinessCard = WebBusinessCard;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebBusinessCard.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", Number)
], WebBusinessCard.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => client_entity_1.Client, (c) => c.businessCard),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], WebBusinessCard.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "subtitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 500 }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "header_image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "phone_1", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "phone_2", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "location_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "facebook_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "instagram_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "whatsapp_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], WebBusinessCard.prototype, "gallery_images", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'draft' }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true, length: 255 }),
    __metadata("design:type", String)
], WebBusinessCard.prototype, "public_slug", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebBusinessCard.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WebBusinessCard.prototype, "updated_at", void 0);
exports.WebBusinessCard = WebBusinessCard = __decorate([
    (0, typeorm_1.Entity)('web_business_cards')
], WebBusinessCard);
//# sourceMappingURL=web-business-card.entity.js.map