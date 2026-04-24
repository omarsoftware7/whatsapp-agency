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
exports.WebUserClient = void 0;
const typeorm_1 = require("typeorm");
const web_user_entity_1 = require("./web-user.entity");
const client_entity_1 = require("./client.entity");
let WebUserClient = class WebUserClient {
};
exports.WebUserClient = WebUserClient;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], WebUserClient.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebUserClient.prototype, "web_user_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], WebUserClient.prototype, "client_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => web_user_entity_1.WebUser, (u) => u.brandLinks, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'web_user_id' }),
    __metadata("design:type", web_user_entity_1.WebUser)
], WebUserClient.prototype, "webUser", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_entity_1.Client, (c) => c.userLinks, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'client_id' }),
    __metadata("design:type", client_entity_1.Client)
], WebUserClient.prototype, "client", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], WebUserClient.prototype, "created_at", void 0);
exports.WebUserClient = WebUserClient = __decorate([
    (0, typeorm_1.Entity)('web_user_clients'),
    (0, typeorm_1.Unique)(['web_user_id', 'client_id'])
], WebUserClient);
//# sourceMappingURL=web-user-client.entity.js.map