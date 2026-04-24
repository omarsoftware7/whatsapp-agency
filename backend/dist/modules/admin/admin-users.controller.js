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
exports.AdminUsersController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../../common/guards/session.guard");
const admin_guard_1 = require("../../common/guards/admin.guard");
const admin_service_1 = require("./admin.service");
let AdminUsersController = class AdminUsersController {
    constructor(admin) {
        this.admin = admin;
    }
    list() { return this.admin.listUsers(); }
    create(body) { return this.admin.createUser(body); }
    update(id, body) { return this.admin.updateUser(id, body); }
};
exports.AdminUsersController = AdminUsersController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "update", null);
exports.AdminUsersController = AdminUsersController = __decorate([
    (0, common_1.Controller)('admin/users'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminUsersController);
//# sourceMappingURL=admin-users.controller.js.map