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
exports.MetaOAuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const session_guard_1 = require("../../common/guards/session.guard");
const meta_service_1 = require("./meta.service");
const web_brand_profile_entity_1 = require("../../entities/web-brand-profile.entity");
let MetaOAuthController = class MetaOAuthController {
    constructor(meta, config, profileRepo) {
        this.meta = meta;
        this.config = config;
        this.profileRepo = profileRepo;
    }
    status(id) {
        return this.meta.getOAuthStatus(id);
    }
    startOAuth(id, req, res) {
        req.session.meta_oauth_client_id = id;
        const appId = this.config.get('META_APP_ID');
        const redirectUri = `${this.config.get('FRONTEND_URL')}/api/brands/${id}/meta-oauth/callback`;
        const params = new URLSearchParams({
            client_id: appId,
            redirect_uri: redirectUri,
            scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
            response_type: 'code',
        });
        res.redirect(`https://www.facebook.com/dialog/oauth?${params}`);
    }
    async callback(id, code, res) {
        const redirectUri = `${this.config.get('FRONTEND_URL')}/api/brands/${id}/meta-oauth/callback`;
        const tokens = await this.meta.exchangeCodeForToken(code, redirectUri);
        let profile = await this.profileRepo.findOne({ where: { client_id: id } });
        if (!profile)
            profile = this.profileRepo.create({ client_id: id });
        profile.meta_page_id = tokens.pageId;
        profile.meta_page_token = tokens.pageToken;
        profile.meta_page_token_expires = tokens.expires;
        profile.instagram_account_id = tokens.igAccountId;
        profile.meta_tokens_valid = true;
        await this.profileRepo.save(profile);
        res.redirect(`/app?meta_connected=1&brand=${id}`);
    }
};
exports.MetaOAuthController = MetaOAuthController;
__decorate([
    (0, common_1.Get)(':id/meta-status'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], MetaOAuthController.prototype, "status", null);
__decorate([
    (0, common_1.Get)(':id/meta-oauth/start'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object]),
    __metadata("design:returntype", void 0)
], MetaOAuthController.prototype, "startOAuth", null);
__decorate([
    (0, common_1.Get)(':id/meta-oauth/callback'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('code')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, Object]),
    __metadata("design:returntype", Promise)
], MetaOAuthController.prototype, "callback", null);
exports.MetaOAuthController = MetaOAuthController = __decorate([
    (0, common_1.Controller)('brands'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(2, (0, typeorm_1.InjectRepository)(web_brand_profile_entity_1.WebBrandProfile)),
    __metadata("design:paramtypes", [meta_service_1.MetaService,
        config_1.ConfigService,
        typeorm_2.Repository])
], MetaOAuthController);
//# sourceMappingURL=meta-oauth.controller.js.map