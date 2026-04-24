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
exports.AdminMetricsController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../../common/guards/session.guard");
const admin_guard_1 = require("../../common/guards/admin.guard");
const admin_service_1 = require("./admin.service");
let AdminMetricsController = class AdminMetricsController {
    constructor(admin) {
        this.admin = admin;
    }
    metrics(period) { return this.admin.getMetrics(parseInt(period || '30')); }
};
exports.AdminMetricsController = AdminMetricsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminMetricsController.prototype, "metrics", null);
exports.AdminMetricsController = AdminMetricsController = __decorate([
    (0, common_1.Controller)('admin/metrics'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminMetricsController);
//# sourceMappingURL=admin-metrics.controller.js.map