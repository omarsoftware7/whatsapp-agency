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
exports.MetaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const axios_1 = require("axios");
const web_brand_profile_entity_1 = require("../../entities/web-brand-profile.entity");
let MetaService = class MetaService {
    constructor(config, profileRepo) {
        this.config = config;
        this.profileRepo = profileRepo;
        this.graphBase = `https://graph.facebook.com/${config.get('META_GRAPH_VERSION', 'v18.0')}`;
    }
    async getOAuthStatus(clientId) {
        const profile = await this.profileRepo.findOne({ where: { client_id: clientId } });
        if (!profile)
            return { connected: false };
        const expiresSoon = profile.meta_page_token_expires
            ? (profile.meta_page_token_expires.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
            : false;
        return {
            connected: profile.meta_tokens_valid,
            page_id: profile.meta_page_id,
            instagram_account_id: profile.instagram_account_id,
            expires_at: profile.meta_page_token_expires,
            expires_soon: expiresSoon,
        };
    }
    async publish(job, publishType, profile) {
        if (!profile.meta_page_token || !profile.meta_page_id) {
            throw new common_1.BadRequestException('Meta not connected for this brand');
        }
        const imageUrls = job.design_variations || [];
        const approvedUrl = imageUrls[job.approved_design_index ?? 0];
        const adCopy = job.ad_copy ? JSON.parse(job.ad_copy) : {};
        const caption = [adCopy.headline, adCopy.body, adCopy.cta].filter(Boolean).join('\n\n');
        const fbPostId = await this.publishFacebook(profile.meta_page_id, profile.meta_page_token, approvedUrl, caption, publishType);
        const igPostId = await this.publishInstagram(profile.meta_page_id, profile.meta_instagram_account_id(profile), profile.meta_page_token, approvedUrl, caption, publishType);
        return { facebook_post_id: fbPostId, instagram_post_id: igPostId };
    }
    async publishFacebook(pageId, token, imageUrl, message, type) {
        if (type === 'story') {
            const res = await axios_1.default.post(`${this.graphBase}/${pageId}/photo_stories`, {
                url: imageUrl,
                access_token: token,
            });
            return res.data.post_id;
        }
        const res = await axios_1.default.post(`${this.graphBase}/${pageId}/photos`, {
            url: imageUrl,
            message,
            access_token: token,
        });
        return res.data.post_id;
    }
    async publishInstagram(pageId, igAccountId, token, imageUrl, caption, type) {
        if (!igAccountId)
            return null;
        const mediaType = type === 'story' ? 'STORIES' : 'IMAGE';
        const createRes = await axios_1.default.post(`${this.graphBase}/${igAccountId}/media`, {
            image_url: imageUrl,
            caption,
            media_type: mediaType,
            access_token: token,
        });
        const containerId = createRes.data.id;
        await this.sleep(3000);
        const publishRes = await axios_1.default.post(`${this.graphBase}/${igAccountId}/media_publish`, {
            creation_id: containerId,
            access_token: token,
        });
        return publishRes.data.id;
    }
    async exchangeCodeForToken(code, redirectUri) {
        const appId = this.config.get('META_APP_ID');
        const appSecret = this.config.get('META_APP_SECRET');
        const shortRes = await axios_1.default.get(`${this.graphBase}/oauth/access_token`, {
            params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
        });
        const shortToken = shortRes.data.access_token;
        const longRes = await axios_1.default.get(`${this.graphBase}/oauth/access_token`, {
            params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken },
        });
        const longToken = longRes.data.access_token;
        const pagesRes = await axios_1.default.get(`${this.graphBase}/me/accounts`, {
            params: { access_token: longToken },
        });
        const page = pagesRes.data.data[0];
        if (!page)
            throw new common_1.BadRequestException('No Facebook pages found');
        const igRes = await axios_1.default.get(`${this.graphBase}/${page.id}`, {
            params: { fields: 'instagram_business_account', access_token: page.access_token },
        });
        const igId = igRes.data.instagram_business_account?.id ?? null;
        const expires = new Date();
        expires.setDate(expires.getDate() + 60);
        return { pageId: page.id, pageToken: page.access_token, igAccountId: igId, expires };
    }
    sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
};
exports.MetaService = MetaService;
exports.MetaService = MetaService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(web_brand_profile_entity_1.WebBrandProfile)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], MetaService);
web_brand_profile_entity_1.WebBrandProfile.prototype['meta_instagram_account_id'] = function (self) {
    return self.instagram_account_id;
};
//# sourceMappingURL=meta.service.js.map