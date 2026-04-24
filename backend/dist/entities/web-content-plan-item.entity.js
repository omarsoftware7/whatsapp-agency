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
exports.WebContentPlanItem = void 0;
const typeorm_1 = require("typeorm");
const web_content_plan_entity_1 = require("./web-content-plan.entity");
const client_entity_1 = require("./client.entity");
const creative_job_entity_1 = require("./creative-job.entity");
let WebContentPlanItem = class WebContentPlanItem {
};
exports.WebContentPlanItem = WebContentPlanItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebContentPlanItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebContentPlanItem.prototype, "plan_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebContentPlanItem.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => web_content_plan_entity_1.WebContentPlan, (p) => p.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'plan_id' }),
    __metadata("design:type", web_content_plan_entity_1.WebContentPlan)
], WebContentPlanItem.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], WebContentPlanItem.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 255 }),
    __metadata("design:type", String)
], WebContentPlanItem.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WebContentPlanItem.prototype, "idea_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], WebContentPlanItem.prototype, "job_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'draft' }),
    __metadata("design:type", String)
], WebContentPlanItem.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], WebContentPlanItem.prototype, "job_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => creative_job_entity_1.CreativeJob, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'job_id' }),
    __metadata("design:type", creative_job_entity_1.CreativeJob)
], WebContentPlanItem.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebContentPlanItem.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], WebContentPlanItem.prototype, "updated_at", void 0);
exports.WebContentPlanItem = WebContentPlanItem = __decorate([
    (0, typeorm_1.Entity)('web_content_plan_items')
], WebContentPlanItem);
//# sourceMappingURL=web-content-plan-item.entity.js.map