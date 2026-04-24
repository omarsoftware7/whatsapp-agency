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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessCardsController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../../common/guards/session.guard");
const admin_guard_1 = require("../../common/guards/admin.guard");
const business_cards_service_1 = require("./business-cards.service");
let BusinessCardsController = class BusinessCardsController {
    constructor(service) {
        this.service = service;
    }
    async renderPublic(slug, res) {
        const card = await this.service.getBySlug(slug);
        res.json(card);
    }
    get(clientId) {
        return this.service.getForClient(clientId);
    }
    save(clientId, body) {
        return this.service.save(clientId, body);
    }
    listAll() {
        return this.service.listAll();
    }
};
exports.BusinessCardsController = BusinessCardsController;
__decorate([
    (0, common_1.Get)('public/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BusinessCardsController.prototype, "renderPublic", null);
__decorate([
    (0, common_1.Get)(':clientId'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_1.Param)('clientId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], BusinessCardsController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':clientId'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_1.Param)('clientId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], BusinessCardsController.prototype, "save", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard, admin_guard_1.AdminGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BusinessCardsController.prototype, "listAll", null);
exports.BusinessCardsController = BusinessCardsController = __decorate([
    (0, common_1.Controller)('business-cards'),
    __metadata("design:paramtypes", [business_cards_service_1.BusinessCardsService])
], BusinessCardsController);
//# sourceMappingURL=business-cards.controller.js.map