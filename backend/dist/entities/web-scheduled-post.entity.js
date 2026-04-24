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
exports.WebScheduledPost = void 0;
const typeorm_1 = require("typeorm");
const creative_job_entity_1 = require("./creative-job.entity");
const client_entity_1 = require("./client.entity");
let WebScheduledPost = class WebScheduledPost {
};
exports.WebScheduledPost = WebScheduledPost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebScheduledPost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", Number)
], WebScheduledPost.prototype, "job_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebScheduledPost.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => creative_job_entity_1.CreativeJob),
    (0, typeorm_1.JoinColumn)({ name: 'job_id' }),
    __metadata("design:type", creative_job_entity_1.CreativeJob)
], WebScheduledPost.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], WebScheduledPost.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], WebScheduledPost.prototype, "scheduled_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10 }),
    __metadata("design:type", String)
], WebScheduledPost.prototype, "publish_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pending' }),
    __metadata("design:type", String)
], WebScheduledPost.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WebScheduledPost.prototype, "error_message", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebScheduledPost.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], WebScheduledPost.prototype, "published_at", void 0);
exports.WebScheduledPost = WebScheduledPost = __decorate([
    (0, typeorm_1.Entity)('web_scheduled_posts')
], WebScheduledPost);
//# sourceMappingURL=web-scheduled-post.entity.js.map