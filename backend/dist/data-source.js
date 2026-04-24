"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
const client_entity_1 = require("./entities/client.entity");
const creative_job_entity_1 = require("./entities/creative-job.entity");
const web_user_entity_1 = require("./entities/web-user.entity");
const web_brand_profile_entity_1 = require("./entities/web-brand-profile.entity");
const web_user_client_entity_1 = require("./entities/web-user-client.entity");
const web_multi_product_entity_1 = require("./entities/web-multi-product.entity");
const web_landing_page_entity_1 = require("./entities/web-landing-page.entity");
const web_business_card_entity_1 = require("./entities/web-business-card.entity");
const web_scheduled_post_entity_1 = require("./entities/web-scheduled-post.entity");
const web_content_plan_entity_1 = require("./entities/web-content-plan.entity");
const web_content_plan_item_entity_1 = require("./entities/web-content-plan-item.entity");
const web_design_edit_request_entity_1 = require("./entities/web-design-edit-request.entity");
const web_logo_option_entity_1 = require("./entities/web-logo-option.entity");
const web_payment_entity_1 = require("./entities/web-payment.entity");
const web_landing_page_lead_entity_1 = require("./entities/web-landing-page-lead.entity");
const web_landing_page_edit_entity_1 = require("./entities/web-landing-page-edit.entity");
const web_deleted_job_entity_1 = require("./entities/web-deleted-job.entity");
const web_deleted_landing_page_entity_1 = require("./entities/web-deleted-landing-page.entity");
const web_referral_code_entity_1 = require("./entities/web-referral-code.entity");
const web_referral_entity_1 = require("./entities/web-referral.entity");
const web_user_meta_entity_1 = require("./entities/web-user-meta.entity");
const web_manual_lead_entity_1 = require("./entities/web-manual-lead.entity");
const activity_log_entity_1 = require("./entities/activity-log.entity");
const api_key_entity_1 = require("./entities/api-key.entity");
const lead_entity_1 = require("./entities/lead.entity");
(0, dotenv_1.config)();
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    entities: [
        client_entity_1.Client, creative_job_entity_1.CreativeJob, web_user_entity_1.WebUser, web_brand_profile_entity_1.WebBrandProfile, web_user_client_entity_1.WebUserClient,
        web_multi_product_entity_1.WebMultiProduct, web_landing_page_entity_1.WebLandingPage, web_business_card_entity_1.WebBusinessCard, web_scheduled_post_entity_1.WebScheduledPost,
        web_content_plan_entity_1.WebContentPlan, web_content_plan_item_entity_1.WebContentPlanItem, web_design_edit_request_entity_1.WebDesignEditRequest, web_logo_option_entity_1.WebLogoOption,
        web_payment_entity_1.WebPayment, web_landing_page_lead_entity_1.WebLandingPageLead, web_landing_page_edit_entity_1.WebLandingPageEdit, web_deleted_job_entity_1.WebDeletedJob,
        web_deleted_landing_page_entity_1.WebDeletedLandingPage, web_referral_code_entity_1.WebReferralCode, web_referral_entity_1.WebReferral, web_user_meta_entity_1.WebUserMeta,
        web_manual_lead_entity_1.WebManualLead, activity_log_entity_1.ActivityLog, api_key_entity_1.ApiKey, lead_entity_1.Lead,
    ],
    migrations: ['dist/migrations/*.js'],
    synchronize: false,
    logging: process.env.NODE_ENV !== 'production',
});
//# sourceMappingURL=data-source.js.map