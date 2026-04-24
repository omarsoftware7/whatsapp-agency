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
exports.FilesController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const api_key_guard_1 = require("../../common/guards/api-key.guard");
const fs = require("fs");
const path = require("path");
const MIME_MAP = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4',
    '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf',
};
let FilesController = class FilesController {
    constructor(config) {
        this.config = config;
    }
    serveFile(filePath, res) {
        const uploadsDir = this.config.get('UPLOADS_DIR', './uploads');
        const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
        const fullPath = path.join(uploadsDir, safePath);
        if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
            throw new common_1.NotFoundException('File not found');
        }
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'private, max-age=3600');
        fs.createReadStream(fullPath).pipe(res);
    }
};
exports.FilesController = FilesController;
__decorate([
    (0, common_1.Get)('*'),
    __param(0, (0, common_1.Param)('0')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "serveFile", null);
exports.FilesController = FilesController = __decorate([
    (0, common_1.Controller)('files'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FilesController);
//# sourceMappingURL=files.controller.js.map