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
var GeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
let GeminiService = GeminiService_1 = class GeminiService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(GeminiService_1.name);
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    }
    get textModel() { return this.config.get('GOOGLE_TEXT_MODEL', 'gemini-2.0-flash-exp'); }
    get imageModel() { return this.config.get('GOOGLE_IMAGE_MODEL', 'gemini-3-pro-image-preview'); }
    get editModel() { return this.config.get('GOOGLE_EDIT_IMAGE_MODEL', 'models/gemini-2.5-flash-image'); }
    get apiKey() { return this.config.get('GOOGLE_API_KEY'); }
    async generateText(prompt, maxTokens = 2048, temperature = 0.7) {
        const res = await axios_1.default.post(`${this.baseUrl}/models/${this.textModel}:generateContent?key=${this.apiKey}`, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: maxTokens, temperature },
        });
        return res.data.candidates[0].content.parts[0].text;
    }
    async generateTextWithImages(prompt, imageParts, maxTokens = 2048) {
        const parts = [...imageParts, { text: prompt }];
        const res = await axios_1.default.post(`${this.baseUrl}/models/${this.textModel}:generateContent?key=${this.apiKey}`, { contents: [{ parts }], generationConfig: { maxOutputTokens: maxTokens } });
        return res.data.candidates[0].content.parts[0].text;
    }
    async generateImage(prompt, imageParts = [], model) {
        const m = model || this.imageModel;
        const parts = [...imageParts, { text: prompt }];
        const res = await axios_1.default.post(`${this.baseUrl}/models/${m}:generateContent?key=${this.apiKey}`, {
            contents: [{ parts }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        });
        const imgPart = res.data.candidates[0].content.parts.find((p) => p.inlineData);
        if (!imgPart)
            throw new Error('No image returned from Gemini');
        return Buffer.from(imgPart.inlineData.data, 'base64');
    }
    async editImage(prompt, currentImageBase64, mimeType = 'image/png') {
        const parts = [
            { inlineData: { mimeType, data: currentImageBase64 } },
            { text: prompt },
        ];
        const res = await axios_1.default.post(`${this.baseUrl}/${this.editModel}:generateContent?key=${this.apiKey}`, {
            contents: [{ parts }],
            generationConfig: { responseModalities: ['IMAGE'] },
        });
        const imgPart = res.data.candidates[0].content.parts.find((p) => p.inlineData);
        if (!imgPart)
            throw new Error('No image returned from Gemini edit');
        return Buffer.from(imgPart.inlineData.data, 'base64');
    }
    toInlinePart(buffer, mimeType = 'image/png') {
        return { inlineData: { mimeType, data: buffer.toString('base64') } };
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map