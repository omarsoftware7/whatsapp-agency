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
exports.GoogleOAuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const auth_service_1 = require("./auth.service");
const crypto_1 = require("crypto");
let GoogleOAuthController = class GoogleOAuthController {
    constructor(authService, config) {
        this.authService = authService;
        this.config = config;
    }
    start(req, res) {
        const state = (0, crypto_1.randomBytes)(16).toString('hex');
        req.session.oauth_state = state;
        const params = new URLSearchParams({
            client_id: this.config.get('GOOGLE_CLIENT_ID', ''),
            redirect_uri: this.config.get('GOOGLE_CALLBACK_URL', ''),
            response_type: 'code',
            scope: 'openid email profile',
            state,
        });
        res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    }
    async callback(query, req, res) {
        const { code, state } = query;
        if (!code || state !== req.session.oauth_state) {
            return res.redirect('/login?error=oauth_failed');
        }
        const tokenRes = await axios_1.default.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: this.config.get('GOOGLE_CLIENT_ID'),
            client_secret: this.config.get('GOOGLE_CLIENT_SECRET'),
            redirect_uri: this.config.get('GOOGLE_CALLBACK_URL'),
            grant_type: 'authorization_code',
        });
        const infoRes = await axios_1.default.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenRes.data.id_token}`);
        const profile = infoRes.data;
        const user = await this.authService.findOrCreateGoogleUser({
            googleId: profile.sub,
            email: profile.email,
            firstName: profile.given_name,
            lastName: profile.family_name,
            avatar: profile.picture,
        });
        req.session.regenerate((err) => {
            if (err)
                return res.redirect('/login?error=session_error');
            Object.assign(req.session, this.authService.buildSessionData(user));
            res.redirect('/app');
        });
    }
};
exports.GoogleOAuthController = GoogleOAuthController;
__decorate([
    (0, common_1.Get)('start'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], GoogleOAuthController.prototype, "start", null);
__decorate([
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], GoogleOAuthController.prototype, "callback", null);
exports.GoogleOAuthController = GoogleOAuthController = __decorate([
    (0, common_1.Controller)('auth/google'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], GoogleOAuthController);
//# sourceMappingURL=google-oauth.controller.js.map