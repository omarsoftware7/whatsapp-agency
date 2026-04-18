import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
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
  },
);

export interface SessionUser {
  id: number;
  email: string;
  role: string;
  maxBrands: number;
  planTier: string;
  subscriptionStatus: string;
  textCredits: number;
  imageCredits: number;
  videoCredits: number;
  landingCredits: number;
}
