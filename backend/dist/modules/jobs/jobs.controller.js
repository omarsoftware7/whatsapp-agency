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
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../../common/guards/session.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jobs_service_1 = require("./jobs.service");
let JobsController = class JobsController {
    constructor(jobs) {
        this.jobs = jobs;
    }
    list(clientId, user) {
        return this.jobs.list(clientId, user.id);
    }
    create(body, user) {
        return this.jobs.create(body, user.id);
    }
    cancel(id, user) {
        return this.jobs.cancel(id, user.id);
    }
    reset(id, user) {
        return this.jobs.reset(id, user.id);
    }
    retryVideo(id, user) {
        return this.jobs.retryVideo(id, user.id);
    }
    softDelete(id, user) {
        return this.jobs.softDelete(id, user.id);
    }
    submitEdit(id, body, user) {
        return this.jobs.submitEditRequest(id, user.id, body.user_edit, body.image_url, body.edit_mode);
    }
    editHistory(id, user) {
        return this.jobs.getEditHistory(id, user.id);
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('client_id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)(':id/reset'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "reset", null);
__decorate([
    (0, common_1.Post)(':id/retry-video'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "retryVideo", null);
__decorate([
    (0, common_1.Post)(':id/delete'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "softDelete", null);
__decorate([
    (0, common_1.Post)(':id/edit-design'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "submitEdit", null);
__decorate([
    (0, common_1.Get)(':id/edit-history'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "editHistory", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('jobs'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __metadata("design:paramtypes", [jobs_service_1.JobsService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map