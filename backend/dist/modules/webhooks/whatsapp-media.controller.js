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
exports.WhatsappMediaController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const api_key_guard_1 = require("../../common/guards/api-key.guard");
const whatsapp_service_1 = require("./whatsapp.service");
const axios_1 = require("axios");
const fs = require("fs");
const path = require("path");
let WhatsappMediaController = class WhatsappMediaController {
    constructor(whatsapp, config) {
        this.whatsapp = whatsapp;
        this.config = config;
    }
    async getMedia(body) {
        const mediaId = body.media_id;
        const saveToServer = body.save_to_server !== false;
        let filename = body.filename ?? null;
        if (!mediaId)
            throw new common_1.BadRequestException('media_id required');
        const waToken = this.config.get('WA_ACCESS_TOKEN');
        const graphVersion = this.config.get('META_GRAPH_VERSION', 'v18.0');
        const uploadsDir = this.config.get('UPLOADS_DIR', './uploads');
        const baseUrl = this.config.get('API_BASE_URL', '');
        const urlRes = await axios_1.default.get(`https://graph.facebook.com/${graphVersion}/${mediaId}`, {
            headers: { Authorization: `Bearer ${waToken}` },
        });
        const downloadUrl = urlRes.data.url;
        const mimeType = urlRes.data.mime_type || 'image/jpeg';
        const fileRes = await axios_1.default.get(downloadUrl, {
            headers: { Authorization: `Bearer ${waToken}` },
            responseType: 'arraybuffer',
        });
        const fileData = Buffer.from(fileRes.data);
        if (!saveToServer) {
            return { status: 'success', media_id: mediaId, mime_type: mimeType, base64_data: fileData.toString('base64'), file_size: fileData.length };
        }
        const extMap = {
            'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
            'image/webp': 'webp', 'video/mp4': 'mp4', 'image/gif': 'gif',
            'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf',
        };
        const ext = extMap[mimeType] ?? 'bin';
        if (!filename) {
            filename = `whatsapp_${Date.now()}_${mediaId}.${ext}`;
        }
        else if (!path.extname(filename)) {
            filename += `.${ext}`;
        }
        let subdir = 'products';
        if (mimeType.startsWith('video/'))
            subdir = 'generated';
        else if (!mimeType.startsWith('image/'))
            subdir = '';
        const saveDir = path.join(uploadsDir, subdir);
        if (!fs.existsSync(saveDir))
            fs.mkdirSync(saveDir, { recursive: true });
        const savePath = path.join(saveDir, filename);
        fs.writeFileSync(savePath, fileData);
        const publicUrl = `${baseUrl}/uploads/${subdir ? subdir + '/' : ''}${filename}`;
        return { status: 'success', media_id: mediaId, mime_type: mimeType, filename, saved_path: savePath, public_url: publicUrl, file_size: fileData.length };
    }
};
exports.WhatsappMediaController = WhatsappMediaController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappMediaController.prototype, "getMedia", null);
exports.WhatsappMediaController = WhatsappMediaController = __decorate([
    (0, common_1.Controller)('get-whatsapp-media'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService,
        config_1.ConfigService])
], WhatsappMediaController);
//# sourceMappingURL=whatsapp-media.controller.js.map