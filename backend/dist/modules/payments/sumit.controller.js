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
exports.SumitController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../../common/guards/session.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const sumit_service_1 = require("./sumit.service");
let SumitController = class SumitController {
    constructor(sumit) {
        this.sumit = sumit;
    }
    create(body, user) {
        return this.sumit.createSubscription(user.id, body.plan_tier, body);
    }
    cancel(user) {
        return this.sumit.cancelSubscription(user.id);
    }
};
exports.SumitController = SumitController;
__decorate([
    (0, common_1.Post)('create-subscription'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SumitController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SumitController.prototype, "cancel", null);
exports.SumitController = SumitController = __decorate([
    (0, common_1.Controller)('payments/sumit'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __metadata("design:paramtypes", [sumit_service_1.SumitService])
], SumitController);
//# sourceMappingURL=sumit.controller.js.map