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
exports.SumitService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const axios_1 = require("axios");
const web_user_entity_1 = require("../../entities/web-user.entity");
const web_payment_entity_1 = require("../../entities/web-payment.entity");
const paypal_service_1 = require("./paypal.service");
let SumitService = class SumitService {
    constructor(config, userRepo, paymentRepo, paypalService) {
        this.config = config;
        this.userRepo = userRepo;
        this.paymentRepo = paymentRepo;
        this.paypalService = paypalService;
    }
    async createSubscription(userId, planTier, cardDetails) {
        const apiKey = this.config.get('SUMIT_API_KEY');
        const companyId = this.config.get('SUMIT_COMPANY_ID');
        const res = await axios_1.default.post(`https://api.sumit.co.il/billing/recurring/create`, { ...cardDetails, plan_tier: planTier }, { headers: { Authorization: `Bearer ${apiKey}`, 'X-Company-ID': companyId } });
        if (!res.data.success)
            throw new common_1.BadRequestException('Sumit payment failed');
        await this.paypalService.applyActivePlan(userId, planTier, 'monthly', res.data.recurring_id, 'sumit');
        await this.userRepo.update(userId, {
            sumit_customer_id: res.data.customer_id,
            sumit_recurring_id: res.data.recurring_id,
            payment_last4: cardDetails.card_number?.slice(-4),
        });
        await this.paymentRepo.save(this.paymentRepo.create({ web_user_id: userId, provider: 'sumit', amount: res.data.amount, currency: 'ILS', status: 'success', reference: res.data.transaction_id }));
        return { success: true };
    }
    async cancelSubscription(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user?.sumit_recurring_id)
            throw new common_1.BadRequestException('No active Sumit subscription');
        const apiKey = this.config.get('SUMIT_API_KEY');
        const companyId = this.config.get('SUMIT_COMPANY_ID');
        await axios_1.default.post(`https://api.sumit.co.il/billing/recurring/cancel`, { recurring_id: user.sumit_recurring_id }, { headers: { Authorization: `Bearer ${apiKey}`, 'X-Company-ID': companyId } });
        await this.userRepo.update(userId, { subscription_status: 'canceled' });
        return { success: true };
    }
};
exports.SumitService = SumitService;
exports.SumitService = SumitService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(web_user_entity_1.WebUser)),
    __param(2, (0, typeorm_1.InjectRepository)(web_payment_entity_1.WebPayment)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        paypal_service_1.PaypalService])
], SumitService);
//# sourceMappingURL=sumit.service.js.map