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
var KieService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KieService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let KieService = KieService_1 = class KieService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(KieService_1.name);
        this.baseUrl = 'https://api.kie.ai/api/v1';
    }
    get headers() {
        const key = this.config.get('KIE_API_KEY');
        return { Authorization: `Bearer ${key}`, 'X-API-Key': key };
    }
    async generateVideo(prompt, imageUrls, aspectRatio = '1:1') {
        const res = await axios_1.default.post(`${this.baseUrl}/veo/generate`, { prompt, model: 'veo3_fast', aspectRatio, imageUrls }, { headers: this.headers });
        return res.data.data?.taskId;
    }
    async pollVideo(taskId, maxAttempts = 30, intervalMs = 10000) {
        for (let i = 0; i < maxAttempts; i++) {
            await this.sleep(intervalMs);
            const res = await axios_1.default.get(`${this.baseUrl}/veo/record-info`, {
                params: { taskId },
                headers: this.headers,
            });
            const data = res.data.data;
            if (data?.successFlag === 1 && data?.resultUrls?.[0]) {
                return data.resultUrls[0];
            }
            if (data?.failFlag === 1)
                throw new Error('KIE video generation failed');
        }
        throw new Error('KIE video generation timed out');
    }
    sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
};
exports.KieService = KieService;
exports.KieService = KieService = KieService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KieService);
//# sourceMappingURL=kie.service.js.map