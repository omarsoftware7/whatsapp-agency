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
exports.PaypalService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const axios_1 = require("axios");
const web_user_entity_1 = require("../../entities/web-user.entity");
const web_payment_entity_1 = require("../../entities/web-payment.entity");
const auth_service_1 = require("../auth/auth.service");
const PLAN_PRICES = {
    starter: { monthly: '179', yearly: '1716' },
    growth: { monthly: '449', yearly: '4309' },
    pro: { monthly: '899', yearly: '8630' },
    agency: { monthly: '1499', yearly: '14390' },
};
let PaypalService = class PaypalService {
    constructor(config, userRepo, paymentRepo) {
        this.config = config;
        this.userRepo = userRepo;
        this.paymentRepo = paymentRepo;
        this.baseUrl = config.get('PAYPAL_BASE_URL', 'https://api-m.paypal.com');
    }
    async getAccessToken() {
        const res = await axios_1.default.post(`${this.baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
            auth: {
                username: this.config.get('PAYPAL_CLIENT_ID', ''),
                password: this.config.get('PAYPAL_CLIENT_SECRET', ''),
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return res.data.access_token;
    }
    async createSubscription(planTier, planInterval, userId, trialDays = 7) {
        const token = await this.getAccessToken();
        const planId = this.config.get(`PAYPAL_PLAN_ID_${planTier.toUpperCase()}_${planInterval.toUpperCase()}`);
        if (!planId)
            throw new common_1.BadRequestException('PayPal plan not configured for this tier');
        const res = await axios_1.default.post(`${this.baseUrl}/v1/billing/subscriptions`, {
            plan_id: planId,
            application_context: {
                brand_name: 'Launcho',
                return_url: `${this.config.get('FRONTEND_URL')}/pricing?payment=success`,
                cancel_url: `${this.config.get('FRONTEND_URL')}/pricing?payment=cancel`,
            },
        }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
        return { subscription_id: res.data.id, approval_url: res.data.links.find((l) => l.rel === 'approve')?.href };
    }
    async activateSubscription(subscriptionId, userId) {
        const token = await this.getAccessToken();
        const res = await axios_1.default.get(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const sub = res.data;
        const planTierId = sub.plan_id;
        const planTier = this.resolvePlanTier(planTierId);
        const planInterval = sub.billing_info?.cycle_executions?.[0]?.tenure_type === 'REGULAR' ? 'monthly' : 'monthly';
        await this.applyActivePlan(userId, planTier, planInterval, subscriptionId, 'paypal');
        await this.paymentRepo.save(this.paymentRepo.create({ web_user_id: userId, provider: 'paypal', amount: parseFloat(PLAN_PRICES[planTier]?.[planInterval] || '0'), currency: 'ILS', status: 'success', reference: subscriptionId }));
        return { success: true };
    }
    async cancelSubscription(userId) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user?.paypal_subscription_id)
            throw new common_1.BadRequestException('No active PayPal subscription');
        const token = await this.getAccessToken();
        await axios_1.default.post(`${this.baseUrl}/v1/billing/subscriptions/${user.paypal_subscription_id}/cancel`, { reason: 'User requested cancellation' }, { headers: { Authorization: `Bearer ${token}` } });
        await this.userRepo.update(userId, { subscription_status: 'canceled' });
        return { success: true };
    }
    async applyActivePlan(userId, planTier, planInterval, subscriptionId, provider) {
        const credits = auth_service_1.PLAN_CREDITS[planTier];
        if (!credits)
            return;
        const planEnd = new Date();
        planEnd.setMonth(planEnd.getMonth() + (planInterval === 'yearly' ? 12 : 1));
        await this.userRepo.update(userId, {
            plan_tier: planTier,
            subscription_status: 'active',
            plan_interval: planInterval,
            plan_end_at: planEnd,
            paypal_subscription_id: subscriptionId,
            payment_provider: provider,
            subscription_started_at: new Date(),
            text_credits_remaining: credits.text,
            image_credits_remaining: credits.image,
            video_credits_remaining: credits.video,
            landing_credits_remaining: credits.landing,
            max_brands: credits.brands,
        });
    }
    resolvePlanTier(planId) {
        const tiers = ['starter', 'growth', 'pro', 'agency'];
        for (const tier of tiers) {
            for (const interval of ['monthly', 'yearly']) {
                const configId = this.config.get(`PAYPAL_PLAN_ID_${tier.toUpperCase()}_${interval.toUpperCase()}`);
                if (configId === planId)
                    return tier;
            }
        }
        return 'starter';
    }
};
exports.PaypalService = PaypalService;
exports.PaypalService = PaypalService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(web_user_entity_1.WebUser)),
    __param(2, (0, typeorm_1.InjectRepository)(web_payment_entity_1.WebPayment)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PaypalService);
//# sourceMappingURL=paypal.service.js.map