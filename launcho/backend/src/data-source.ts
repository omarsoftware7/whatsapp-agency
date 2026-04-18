import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Client } from './entities/client.entity';
import { CreativeJob } from './entities/creative-job.entity';
import { WebUser } from './entities/web-user.entity';
import { WebBrandProfile } from './entities/web-brand-profile.entity';
import { WebUserClient } from './entities/web-user-client.entity';
import { WebMultiProduct } from './entities/web-multi-product.entity';
import { WebLandingPage } from './entities/web-landing-page.entity';
import { WebBusinessCard } from './entities/web-business-card.entity';
import { WebScheduledPost } from './entities/web-scheduled-post.entity';
import { WebContentPlan } from './entities/web-content-plan.entity';
import { WebContentPlanItem } from './entities/web-content-plan-item.entity';
import { WebDesignEditRequest } from './entities/web-design-edit-request.entity';
import { WebLogoOption } from './entities/web-logo-option.entity';
import { WebPayment } from './entities/web-payment.entity';
import { WebLandingPageLead } from './entities/web-landing-page-lead.entity';
import { WebLandingPageEdit } from './entities/web-landing-page-edit.entity';
import { WebDeletedJob } from './entities/web-deleted-job.entity';
import { WebDeletedLandingPage } from './entities/web-deleted-landing-page.entity';
import { WebReferralCode } from './entities/web-referral-code.entity';
import { WebReferral } from './entities/web-referral.entity';
import { WebUserMeta } from './entities/web-user-meta.entity';
import { WebManualLead } from './entities/web-manual-lead.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { ApiKey } from './entities/api-key.entity';
import { Lead } from './entities/lead.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  entities: [
    Client, CreativeJob, WebUser, WebBrandProfile, WebUserClient,
    WebMultiProduct, WebLandingPage, WebBusinessCard, WebScheduledPost,
    WebContentPlan, WebContentPlanItem, WebDesignEditRequest, WebLogoOption,
    WebPayment, WebLandingPageLead, WebLandingPageEdit, WebDeletedJob,
    WebDeletedLandingPage, WebReferralCode, WebReferral, WebUserMeta,
    WebManualLead, ActivityLog, ApiKey, Lead,
  ],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
