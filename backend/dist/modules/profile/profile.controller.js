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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../../common/guards/session.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const profile_service_1 = require("./profile.service");
let ProfileController = class ProfileController {
    constructor(service) {
        this.service = service;
    }
    update(body, user) {
        return this.service.updateProfile(user.id, body);
    }
    changePassword(body, user) {
        return this.service.changePassword(user.id, body.current_password, body.new_password);
    }
    stats(user) {
        return this.service.getStats(user.id);
    }
    limits(user) {
        return this.service.getLimits(user.id);
    }
    deleteAccount(user) {
        return this.service.deleteAccount(user.id);
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Post)('update'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('change-password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "stats", null);
__decorate([
    (0, common_1.Get)('limits'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "limits", null);
__decorate([
    (0, common_1.Post)('delete-account'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "deleteAccount", null);
exports.ProfileController = ProfileController = __decorate([
    (0, common_1.Controller)('profile'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map