"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const google_oauth_controller_1 = require("./google-oauth.controller");
const web_user_entity_1 = require("../../entities/web-user.entity");
const web_referral_code_entity_1 = require("../../entities/web-referral-code.entity");
const web_referral_entity_1 = require("../../entities/web-referral.entity");
const web_user_meta_entity_1 = require("../../entities/web-user-meta.entity");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_user_entity_1.WebUser, web_referral_code_entity_1.WebReferralCode, web_referral_entity_1.WebReferral, web_user_meta_entity_1.WebUserMeta])],
        controllers: [auth_controller_1.AuthController, google_oauth_controller_1.GoogleOAuthController],
        providers: [auth_service_1.AuthService],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map