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
exports.ContentPlansController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../../common/guards/session.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const content_plans_service_1 = require("./content-plans.service");
let ContentPlansController = class ContentPlansController {
    constructor(service) {
        this.service = service;
    }
    getLatest(clientId, user) {
        return this.service.getLatest(clientId, user.id);
    }
    generate(body, user) {
        return this.service.generate(body.client_id, user.id, body.mode, body.user_prompt);
    }
    updateItem(body) {
        return this.service.updateItem(body.item_id, body.title, body.idea_text);
    }
    approveItem(body) {
        return this.service.approveItem(body.item_id);
    }
    createJob(body, user) {
        return this.service.createJobFromItem(body.item_id, user.id, body.image_size, body.language);
    }
};
exports.ContentPlansController = ContentPlansController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('client_id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], ContentPlansController.prototype, "getLatest", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ContentPlansController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)('items/:id/update'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContentPlansController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Post)('items/:id/approve'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ContentPlansController.prototype, "approveItem", null);
__decorate([
    (0, common_1.Post)('items/:id/create-job'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ContentPlansController.prototype, "createJob", null);
exports.ContentPlansController = ContentPlansController = __decorate([
    (0, common_1.Controller)('content-plans'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __metadata("design:paramtypes", [content_plans_service_1.ContentPlansService])
], ContentPlansController);
//# sourceMappingURL=content-plans.controller.js.map