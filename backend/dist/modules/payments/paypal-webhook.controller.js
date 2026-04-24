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
var PaypalWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaypalWebhookController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const paypal_service_1 = require("./paypal.service");
const auth_service_1 = require("../auth/auth.service");
const web_user_entity_1 = require("../../entities/web-user.entity");
const web_payment_entity_1 = require("../../entities/web-payment.entity");
let PaypalWebhookController = PaypalWebhookController_1 = class PaypalWebhookController {
    constructor(paypal, auth, userRepo, paymentRepo) {
        this.paypal = paypal;
        this.auth = auth;
        this.userRepo = userRepo;
        this.paymentRepo = paymentRepo;
        this.logger = new common_1.Logger(PaypalWebhookController_1.name);
    }
    async handle(body, headers) {
        const eventType = body.event_type;
        this.logger.log(`PayPal webhook: ${eventType}`);
        const subscriptionId = body.resource?.id || body.resource?.billing_agreement_id;
        const user = subscriptionId
            ? await this.userRepo.findOne({ where: { paypal_subscription_id: subscriptionId } })
            : null;
        switch (eventType) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
            case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
                if (user) {
                    await this.paypal.applyActivePlan(user.id, user.plan_tier, user.plan_interval, subscriptionId, 'paypal');
                }
                break;
            case 'BILLING.SUBSCRIPTION.CANCELLED':
            case 'BILLING.SUBSCRIPTION.EXPIRED':
            case 'BILLING.SUBSCRIPTION.SUSPENDED':
                if (user) {
                    await this.userRepo.update(user.id, { subscription_status: 'canceled', plan_tier: 'expired' });
                }
                break;
            case 'PAYMENT.SALE.COMPLETED':
                if (user) {
                    const amount = parseFloat(body.resource?.amount?.total || '0');
                    await this.paymentRepo.save(this.paymentRepo.create({ web_user_id: user.id, provider: 'paypal', amount, currency: body.resource?.amount?.currency || 'ILS', status: 'success', reference: body.resource?.id }));
                    await this.auth.applyReferralRewards(user.id);
                }
                break;
            case 'PAYMENT.SALE.DENIED':
                if (user) {
                    await this.userRepo.update(user.id, { subscription_status: 'past_due' });
                }
                break;
        }
        return { received: true };
    }
};
exports.PaypalWebhookController = PaypalWebhookController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaypalWebhookController.prototype, "handle", null);
exports.PaypalWebhookController = PaypalWebhookController = PaypalWebhookController_1 = __decorate([
    (0, common_1.Controller)('webhooks/paypal'),
    __param(2, (0, typeorm_1.InjectRepository)(web_user_entity_1.WebUser)),
    __param(3, (0, typeorm_1.InjectRepository)(web_payment_entity_1.WebPayment)),
    __metadata("design:paramtypes", [paypal_service_1.PaypalService,
        auth_service_1.AuthService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PaypalWebhookController);
//# sourceMappingURL=paypal-webhook.controller.js.map