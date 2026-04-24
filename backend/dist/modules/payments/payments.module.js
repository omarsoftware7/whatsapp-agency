"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const paypal_controller_1 = require("./paypal.controller");
const paypal_service_1 = require("./paypal.service");
const paypal_webhook_controller_1 = require("./paypal-webhook.controller");
const sumit_controller_1 = require("./sumit.controller");
const sumit_service_1 = require("./sumit.service");
const web_user_entity_1 = require("../../entities/web-user.entity");
const web_payment_entity_1 = require("../../entities/web-payment.entity");
const web_referral_entity_1 = require("../../entities/web-referral.entity");
const auth_module_1 = require("../auth/auth.module");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([web_user_entity_1.WebUser, web_payment_entity_1.WebPayment, web_referral_entity_1.WebReferral]), auth_module_1.AuthModule],
        controllers: [paypal_controller_1.PaypalController, paypal_webhook_controller_1.PaypalWebhookController, sumit_controller_1.SumitController],
        providers: [paypal_service_1.PaypalService, sumit_service_1.SumitService],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map