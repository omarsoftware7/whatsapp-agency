"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const brands_controller_1 = require("./brands.controller");
const brands_service_1 = require("./brands.service");
const client_entity_1 = require("../../entities/client.entity");
const web_user_client_entity_1 = require("../../entities/web-user-client.entity");
const web_brand_profile_entity_1 = require("../../entities/web-brand-profile.entity");
const web_logo_option_entity_1 = require("../../entities/web-logo-option.entity");
const ai_module_1 = require("../ai/ai.module");
let BrandsModule = class BrandsModule {
};
exports.BrandsModule = BrandsModule;
exports.BrandsModule = BrandsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([client_entity_1.Client, web_user_client_entity_1.WebUserClient, web_brand_profile_entity_1.WebBrandProfile, web_logo_option_entity_1.WebLogoOption]), ai_module_1.AiModule],
        controllers: [brands_controller_1.BrandsController],
        providers: [brands_service_1.BrandsService],
        exports: [brands_service_1.BrandsService],
    })
], BrandsModule);
//# sourceMappingURL=brands.module.js.map