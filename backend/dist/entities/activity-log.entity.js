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
exports.ActivityLog = void 0;
const typeorm_1 = require("typeorm");
const client_entity_1 = require("./client.entity");
const creative_job_entity_1 = require("./creative-job.entity");
let ActivityLog = class ActivityLog {
};
exports.ActivityLog = ActivityLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], ActivityLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ActivityLog.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], ActivityLog.prototype, "job_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], ActivityLog.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => creative_job_entity_1.CreativeJob, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'job_id' }),
    __metadata("design:type", creative_job_entity_1.CreativeJob)
], ActivityLog.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], ActivityLog.prototype, "event_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], ActivityLog.prototype, "event_data", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ActivityLog.prototype, "created_at", void 0);
exports.ActivityLog = ActivityLog = __decorate([
    (0, typeorm_1.Entity)('activity_log')
], ActivityLog);
//# sourceMappingURL=activity-log.entity.js.map