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
exports.WebDesignEditRequest = void 0;
const typeorm_1 = require("typeorm");
const creative_job_entity_1 = require("./creative-job.entity");
const client_entity_1 = require("./client.entity");
let WebDesignEditRequest = class WebDesignEditRequest {
};
exports.WebDesignEditRequest = WebDesignEditRequest;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebDesignEditRequest.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebDesignEditRequest.prototype, "job_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebDesignEditRequest.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => creative_job_entity_1.CreativeJob, (j) => j.editRequests, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'job_id' }),
    __metadata("design:type", creative_job_entity_1.CreativeJob)
], WebDesignEditRequest.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], WebDesignEditRequest.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], WebDesignEditRequest.prototype, "user_edit", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pending' }),
    __metadata("design:type", String)
], WebDesignEditRequest.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], WebDesignEditRequest.prototype, "error_message", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 500 }),
    __metadata("design:type", String)
], WebDesignEditRequest.prototype, "result_image_url", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebDesignEditRequest.prototype, "requested_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], WebDesignEditRequest.prototype, "completed_at", void 0);
exports.WebDesignEditRequest = WebDesignEditRequest = __decorate([
    (0, typeorm_1.Entity)('web_design_edit_requests')
], WebDesignEditRequest);
//# sourceMappingURL=web-design-edit-request.entity.js.map