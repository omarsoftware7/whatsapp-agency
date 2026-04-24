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
exports.MetaOAuthCompleteController = exports.N8nMetaOAuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const api_key_guard_1 = require("../../common/guards/api-key.guard");
const whatsapp_service_1 = require("./whatsapp.service");
let N8nMetaOAuthController = class N8nMetaOAuthController {
    constructor(whatsapp, config) {
        this.whatsapp = whatsapp;
        this.config = config;
    }
    async getStatus(clientIdStr) {
        if (!clientIdStr)
            throw new common_1.BadRequestException('client_id required');
        const clientId = parseInt(clientIdStr);
        try {
            return this.whatsapp.getMetaStatus(clientId);
        }
        catch (e) {
            throw new common_1.NotFoundException(e.message);
        }
    }
    async saveTokens(body) {
        const clientId = parseInt(body.client_id);
        const pageToken = body.page_token;
        const pageId = body.page_id;
        const igAccountId = body.instagram_account_id ?? null;
        const tokenExpires = body.token_expires ?? null;
        if (!clientId || !pageToken || !pageId)
            throw new common_1.BadRequestException('client_id, page_token, and page_id required');
        return this.whatsapp.saveMetaTokens(clientId, pageToken, pageId, igAccountId, tokenExpires);
    }
};
exports.N8nMetaOAuthController = N8nMetaOAuthController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('client_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], N8nMetaOAuthController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], N8nMetaOAuthController.prototype, "saveTokens", null);
exports.N8nMetaOAuthController = N8nMetaOAuthController = __decorate([
    (0, common_1.Controller)('meta-oauth'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService,
        config_1.ConfigService])
], N8nMetaOAuthController);
let MetaOAuthCompleteController = class MetaOAuthCompleteController {
    constructor(config) {
        this.config = config;
    }
    async handleOAuth(action, clientIdStr, code, state, res) {
        const appId = this.config.get('META_APP_ID');
        const appSecret = this.config.get('META_APP_SECRET');
        const baseUrl = this.config.get('API_BASE_URL', '');
        const callbackUrl = `${baseUrl}/api/meta-oauth-complete`;
        if (action === 'start') {
            if (!clientIdStr)
                return res.status(400).send('client_id required');
            const scope = 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish';
            const fbOAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}&state=${clientIdStr}&response_type=code`;
            return res.redirect(fbOAuthUrl);
        }
        if (code && state) {
            const clientId = parseInt(state);
            try {
                const axios = (await Promise.resolve().then(() => require('axios'))).default;
                const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
                    params: { client_id: appId, client_secret: appSecret, redirect_uri: callbackUrl, code },
                });
                const shortToken = tokenRes.data.access_token;
                const longRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
                    params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken },
                });
                const longToken = longRes.data.access_token;
                const expiresIn = longRes.data.expires_in ?? 5183944;
                const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
                    params: { access_token: longToken },
                });
                const pages = pagesRes.data.data ?? [];
                if (pages.length === 0)
                    return res.status(400).send('No Facebook pages found');
                const page = pages[0];
                const pageToken = page.access_token;
                const pageId = page.id;
                let igAccountId = null;
                try {
                    const igRes = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
                        params: { fields: 'instagram_business_account', access_token: pageToken },
                    });
                    igAccountId = igRes.data.instagram_business_account?.id ?? null;
                }
                catch (_) { }
                const tokenExpires = Math.floor(Date.now() / 1000) + expiresIn;
                return res.json({
                    status: 'authorized',
                    client_id: clientId,
                    page_id: pageId,
                    page_token: pageToken,
                    instagram_account_id: igAccountId,
                    token_expires: tokenExpires,
                    message: 'Authorization successful! You can now publish to Facebook & Instagram.',
                });
            }
            catch (e) {
                return res.status(500).send(`OAuth error: ${e.response?.data?.error?.message ?? e.message}`);
            }
        }
        return res.status(400).send('Invalid request');
    }
};
exports.MetaOAuthCompleteController = MetaOAuthCompleteController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('action')),
    __param(1, (0, common_1.Query)('client_id')),
    __param(2, (0, common_1.Query)('code')),
    __param(3, (0, common_1.Query)('state')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], MetaOAuthCompleteController.prototype, "handleOAuth", null);
exports.MetaOAuthCompleteController = MetaOAuthCompleteController = __decorate([
    (0, common_1.Controller)('meta-oauth-complete'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MetaOAuthCompleteController);
//# sourceMappingURL=n8n-meta-oauth.controller.js.map