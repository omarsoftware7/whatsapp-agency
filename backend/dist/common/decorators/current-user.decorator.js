"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return {
        id: request.session.web_user_id,
        email: request.session.web_user_email,
        role: request.session.web_user_role,
        maxBrands: request.session.web_user_max_brands,
        planTier: request.session.web_user_plan_tier,
        subscriptionStatus: request.session.web_user_subscription_status,
        textCredits: request.session.web_user_text_credits,
        imageCredits: request.session.web_user_image_credits,
        videoCredits: request.session.web_user_video_credits,
        landingCredits: request.session.web_user_landing_credits,
    };
});
//# sourceMappingURL=current-user.decorator.js.map