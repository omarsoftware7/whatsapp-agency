export type PlanTier = 'trial' | 'starter' | 'growth' | 'pro' | 'agency' | 'expired';
export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'expired' | 'past_due';
export type Language = 'en' | 'ar' | 'he';
export type ImageSize = 'post' | 'story';

export type JobType =
  | 'announcement' | 'product_sale' | 'from_image' | 'before_after'
  | 'reel' | 'content_strategy' | 'ugc_video' | 'multi_mode' | 'video' | 'tips_carousel';

export type JobStage =
  | 'await_user_input' | 'pending' | 'generate_design' | 'generate_video'
  | 'await_design_approval' | 'generate_ad_copy' | 'await_copy_approval'
  | 'await_publish_approval' | 'publishing' | 'generate_multi_variants'
  | 'completed' | 'rejected';

export interface SessionUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'user';
  plan_tier: PlanTier;
  subscription_status: SubscriptionStatus;
  max_brands: number;
  text_credits_remaining: number;
  image_credits_remaining: number;
  video_credits_remaining: number;
  landing_credits_remaining: number;
  credits_reset_at: string;
  avatar_url?: string;
  theme_mode: 'brand' | 'default';
  referral_code?: string;
}

export interface Brand {
  id: number;
  business_name: string;
  phone_number: string;
  logo_filename?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  brand_tone?: string;
  default_language: string;
  industry?: string;
  onboarding_complete: boolean;
  brandProfile?: BrandProfile;
}

export interface BrandProfile {
  id: number;
  client_id: number;
  category?: string;
  website?: string;
  instagram_handle?: string;
  target_audience?: string;
  price_range?: string;
  country: string;
  facebook_page_url?: string;
  instagram_page_url?: string;
  meta_tokens_valid: boolean;
  meta_page_id?: string;
  instagram_account_id?: string;
}

export interface CreativeJob {
  id: number;
  client_id: number;
  job_type: JobType;
  current_stage: JobStage;
  user_message?: string;
  user_images?: string[];
  design_variations?: string[];
  approved_design_index?: number;
  ad_copy?: string; // JSON string
  media_type: 'image' | 'video';
  image_size: ImageSize;
  language: Language;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  facebook_post_id?: string;
  instagram_post_id?: string;
  instagram_permalink?: string;
  published_at?: string;
  edit_status?: string;
  multiProducts?: MultiProduct[];
}

export interface MultiProduct {
  id: number;
  job_id: number;
  sort_order: number;
  product_image_url?: string;
  product_name?: string;
  price?: string;
  old_price?: string;
  notes?: string;
  generated_image_url?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface AdCopy {
  headline: string;
  body: string;
  cta: string;
}

export interface LandingPage {
  id: number;
  client_id: number;
  title?: string;
  user_prompt?: string;
  html?: string;
  status: 'draft' | 'generating' | 'published' | 'archived' | 'failed';
  public_slug?: string;
  created_at: string;
}

export interface BusinessCard {
  id: number;
  client_id: number;
  title?: string;
  subtitle?: string;
  header_image_url?: string;
  phone_1?: string;
  phone_2?: string;
  address?: string;
  facebook_url?: string;
  instagram_url?: string;
  whatsapp_number?: string;
  gallery_images?: string[];
  status: string;
  public_slug?: string;
}

export interface ScheduledPost {
  id: number;
  job_id: number;
  client_id: number;
  scheduled_at: string;
  publish_type: 'post' | 'story';
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  job?: CreativeJob;
}

export interface ContentPlan {
  id: number;
  client_id: number;
  mode: 'auto' | 'manual';
  user_prompt?: string;
  created_at: string;
  items: ContentPlanItem[];
}

export interface ContentPlanItem {
  id: number;
  plan_id: number;
  title?: string;
  idea_text?: string;
  job_type: string;
  status: 'draft' | 'approved' | 'created' | 'superseded';
  job_id?: number;
}

export interface Lead {
  id: number;
  landing_page_id: number;
  name?: string;
  email?: string;
  phone?: string;
  source_url?: string;
  created_at: string;
}

export interface AdminMetrics {
  active_users: number;
  trial_users: number;
  total_users: number;
  mrr: number;
  arr: number;
  arpu: number;
  total_jobs: number;
  published_jobs: number;
  publishing_rate: string;
  total_referrals: number;
  period_days: number;
}
