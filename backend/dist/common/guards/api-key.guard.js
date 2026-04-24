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
exports.ApiKeyGuard = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const api_key_entity_1 = require("../../entities/api-key.entity");
let ApiKeyGuard = class ApiKeyGuard {
    constructor(apiKeyRepo) {
        this.apiKeyRepo = apiKeyRepo;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const key = this.extractKey(request);
        if (!key)
            throw new common_1.UnauthorizedException('Missing API key');
        const found = await this.apiKeyRepo.findOne({
            where: { key_value: key, is_active: true },
        });
        if (!found)
            throw new common_1.UnauthorizedException('Invalid API key');
        return true;
    }
    extractKey(request) {
        const header = request.headers['x-api-key'];
        if (header)
            return header;
        const auth = request.headers['authorization'];
        if (auth?.startsWith('Bearer '))
            return auth.slice(7);
        return request.query?.api_key ?? null;
    }
};
exports.ApiKeyGuard = ApiKeyGuard;
exports.ApiKeyGuard = ApiKeyGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(api_key_entity_1.ApiKey)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ApiKeyGuard);
//# sourceMappingURL=api-key.guard.js.map