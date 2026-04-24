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
exports.WebContentPlan = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("./client.entity");
const web_user_entity_1 = require("./web-user.entity");
const web_content_plan_item_entity_1 = require("./web-content-plan-item.entity");
let WebContentPlan = class WebContentPlan {
};
exports.WebContentPlan = WebContentPlan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebContentPlan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebContentPlan.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebContentPlan.prototype, "web_user_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], WebContentPlan.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => web_user_entity_1.WebUser, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'web_user_id' }),
    __metadata("design:type", web_user_entity_1.WebUser)
], WebContentPlan.prototype, "webUser", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], WebContentPlan.prototype, "mode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WebContentPlan.prototype, "user_prompt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebContentPlan.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => web_content_plan_item_entity_1.WebContentPlanItem, (i) => i.plan),
    __metadata("design:type", Array)
], WebContentPlan.prototype, "items", void 0);
exports.WebContentPlan = WebContentPlan = __decorate([
    (0, typeorm_1.Entity)('web_content_plans')
], WebContentPlan);
//# sourceMappingURL=web-content-plan.entity.js.map