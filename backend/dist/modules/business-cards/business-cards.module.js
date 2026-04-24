"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessCardsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const business_cards_controller_1 = require("./business-cards.controller");
const business_cards_service_1 = require("./business-cards.service");
const web_business_card_entity_1 = require("../../entities/web-business-card.entity");
let BusinessCardsModule = class BusinessCardsModule {
};
exports.BusinessCardsModule = BusinessCardsModule;
exports.BusinessCardsModule = BusinessCardsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_business_card_entity_1.WebBusinessCard])],
        controllers: [business_cards_controller_1.BusinessCardsController],
        providers: [business_cards_service_1.BusinessCardsService],
    })
], BusinessCardsModule);
//# sourceMappingURL=business-cards.module.js.map