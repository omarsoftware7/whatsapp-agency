"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const meta_service_1 = require("./meta.service");
const meta_oauth_controller_1 = require("./meta-oauth.controller");
const web_brand_profile_entity_1 = require("../../entities/web-brand-profile.entity");
const client_entity_1 = require("../../entities/client.entity");
let MetaModule = class MetaModule {
};
exports.MetaModule = MetaModule;
exports.MetaModule = MetaModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_brand_profile_entity_1.WebBrandProfile, client_entity_1.Client])],
        providers: [meta_service_1.MetaService],
        controllers: [meta_oauth_controller_1.MetaOAuthController],
        exports: [meta_service_1.MetaService],
    })
], MetaModule);
//# sourceMappingURL=meta.module.js.map