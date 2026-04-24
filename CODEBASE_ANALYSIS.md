# Codebase Analysis: Adly (whatsapp-agency)

> Generated: 2026-04-18  
> Purpose: Pre-migration analysis before NestJS + React rewrite on branch `launcho-ts`

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Authentication](#authentication)
4. [Job State Machine](#job-state-machine)
5. [Credit System](#credit-system)
6. [External Integrations](#external-integrations)
7. [Frontend Pages](#frontend-pages)
8. [Business Logic Notes](#business-logic-notes)

---

## Database Schema

> Database: MySQL (`getdddadly_adly_prod`), PDO singleton via `get_db()`

### `clients`
Core brand/client record shared between WhatsApp and web paths.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AI PK | |
| `phone_number` | VARCHAR(20) UNIQUE | Real WhatsApp number or `web{base36}` for web-created brands |
| `whatsapp_name` | TEXT | |
| `business_name` | TEXT | |
| `business_description` | TEXT | |
| `logo_filename` | VARCHAR(255) | |
| `logo_url` | VARCHAR(500) | GENERATED STORED |
| `primary_color` | VARCHAR(7) | Hex, extracted from logo via GD |
| `secondary_color` | VARCHAR(7) | Hex, extracted from logo via GD |
| `font_preference` | VARCHAR(50) | |
| `brand_tone` | VARCHAR(20) | professional / playful / luxury / minimal / vibrant |
| `default_language` | VARCHAR(5) | en / ar / he |
| `industry` | VARCHAR(100) | |
| `business_phone` | VARCHAR(50) | |
| `business_address` | TEXT | |
| `subscription_status` | ENUM | trial / active / suspended / cancelled |
| `trial_credits` | INT DEFAULT 5 | |
| `monthly_credits` | INT DEFAULT 0 | |
| `content_posts_this_week` | INT DEFAULT 0 | |
| `content_week_reset_date` | DATE | |
| `onboarding_complete` | TINYINT DEFAULT 0 | |
| `onboarding_step` | VARCHAR(50) | upload_logo / complete / etc. |
| `meta_page_id` | TEXT | |
| `meta_page_token` | TEXT | |
| `meta_page_token_expires` | DATETIME | |
| `instagram_account_id` | TEXT | |
| `meta_tokens_valid` | TINYINT DEFAULT 0 | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |
| `last_activity_at` | DATETIME | |

---

### `creative_jobs`
Every AI generation task. Drives the job state machine.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AI PK | |
| `client_id` | INT FK→clients | CASCADE |
| `job_type` | ENUM | announcement / product_sale / from_image / before_after / reel / content_strategy / ugc_video / multi_mode / video / tips_carousel |
| `user_message` | TEXT | |
| `user_images` | JSON | |
| `product_images` | TEXT | JSON string of URLs |
| `detected_language` | VARCHAR | |
| `creative_type` | VARCHAR | |
| `extracted_data` | JSON | |
| `design_prompt` | TEXT | |
| `image_size` | ENUM | post / story |
| `language` | ENUM | en / ar / he |
| `media_type` | VARCHAR(20) DEFAULT 'image' | image / video |
| `design_variations` | JSON | Array of image/video URLs |
| `design_approved` | TINYINT DEFAULT 0 | |
| `design_approved_at` | DATETIME | |
| `approved_design_index` | INT | |
| `ad_copy` | TEXT | JSON: `{"headline":"…","body":"…","cta":"…"}` |
| `ad_copy_approved` | TINYINT DEFAULT 0 | |
| `ad_copy_approved_at` | DATETIME | |
| `publish_approved` | TINYINT DEFAULT 0 | |
| `publish_approved_at` | DATETIME | |
| `facebook_post_id` | VARCHAR | |
| `instagram_post_id` | VARCHAR | |
| `instagram_permalink` | VARCHAR | |
| `published_at` | DATETIME | |
| `is_bulk_sale` | TINYINT DEFAULT 0 | |
| `bulk_products` | JSON | |
| `template_approved` | TINYINT DEFAULT 0 | |
| `reel_video_url` | TEXT | |
| `reel_duration_seconds` | INT | |
| `current_stage` | ENUM | See state machine below |
| `rejection_count` | INT DEFAULT 0 | |
| `error_message` | TEXT | |
| `credits_cost` | INT DEFAULT 1 | |
| `credits_charged` | TINYINT DEFAULT 0 | |
| `created_at` | DATETIME | |
| `completed_at` | DATETIME | |
| `processing_time_ms` | INT | |
| `product_images_count` | INT DEFAULT 0 | |
| `processing_lock` | TINYINT DEFAULT 0 | |
| `processing_lock_at` | DATETIME | |

**`current_stage` values:**
`await_user_input` → `pending` → `generate_design` → `generate_video` → `await_design_approval` → `generate_ad_copy` → `await_copy_approval` → `await_publish_approval` → `publishing` → `generate_multi_variants` → `completed` → `rejected`

---

### `web_users`
SaaS web users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AI PK | |
| `email` | VARCHAR(255) UNIQUE | |
| `password_hash` | VARCHAR(255) | |
| `google_id` | VARCHAR(255) | |
| `first_name`, `last_name` | VARCHAR | |
| `avatar_url` | VARCHAR(500) | |
| `theme_mode` | ENUM | brand / default |
| `account_type` | ENUM | agency / freelancer / business |
| `plan_tier` | ENUM | trial / starter / growth / pro / agency / expired |
| `subscription_status` | ENUM | trial / active / canceled / expired / past_due |
| `trial_end_at` | DATETIME | |
| `plan_end_at` | DATETIME | |
| `plan_interval` | ENUM | monthly / yearly |
| `credits_remaining` | INT DEFAULT 10 | Legacy combined credits |
| `text_credits_remaining` | INT DEFAULT 0 | |
| `image_credits_remaining` | INT DEFAULT 0 | |
| `video_credits_remaining` | INT DEFAULT 0 | |
| `landing_credits_remaining` | INT DEFAULT 0 | |
| `credits_reset_at` | DATETIME | |
| `paypal_subscription_id` | VARCHAR(100) | |
| `payment_provider` | ENUM | paypal / sumit |
| `sumit_customer_id` | VARCHAR | |
| `sumit_recurring_id` | VARCHAR | |
| `payment_last4` | VARCHAR | |
| `subscription_started_at` | DATETIME | |
| `last_login_at` | DATETIME | |
| `role` | ENUM | admin / user |
| `max_brands` | INT DEFAULT 1 | |
| `is_active` | TINYINT DEFAULT 1 | |
| `created_at`, `updated_at` | DATETIME | |

---

### `web_brand_profiles`
Extended brand info for web users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AI PK | |
| `client_id` | INT FK UNIQUE | |
| `category` | VARCHAR | |
| `website` | VARCHAR | |
| `instagram_handle` | VARCHAR | |
| `meta_page_id` | VARCHAR | |
| `meta_page_token` | TEXT | Long-lived page token |
| `meta_page_token_expires` | DATETIME | |
| `instagram_account_id` | VARCHAR | |
| `meta_tokens_valid` | TINYINT DEFAULT 0 | |
| `target_audience` | TEXT | |
| `price_range` | ENUM | low / med / high / unknown |
| `country` | VARCHAR(100) DEFAULT 'Israel' | |
| `facebook_page_url` | VARCHAR | |
| `instagram_page_url` | VARCHAR | |
| `heard_about` | VARCHAR | |
| `created_at`, `updated_at` | DATETIME | |

---

### `web_user_clients`
Many-to-many: users ↔ brands.

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `web_user_id` | FK→web_users CASCADE |
| `client_id` | FK→clients CASCADE |
| `created_at` | DATETIME |
| UNIQUE | `(web_user_id, client_id)` |

---

### `web_multi_products`
Per-product rows for `multi_mode` jobs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AI PK | |
| `job_id` | FK→creative_jobs CASCADE | |
| `sort_order` | INT | |
| `product_image_url` | VARCHAR(500) | |
| `product_name` | VARCHAR(255) | |
| `price` | VARCHAR(50) | |
| `old_price` | VARCHAR(50) | |
| `notes` | TEXT | |
| `generated_image_url` | VARCHAR(500) | |
| `status` | ENUM | pending / generating / completed / failed |
| `error_message` | TEXT | |
| `created_at`, `updated_at` | DATETIME | |

---

### `web_landing_pages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AI PK | |
| `client_id` | FK→clients CASCADE | |
| `title` | VARCHAR(255) | |
| `user_prompt` | TEXT | |
| `user_images` | JSON | |
| `html` | MEDIUMTEXT | Full AI-generated HTML |
| `status` | ENUM | draft / generating / published / archived / failed |
| `public_slug` | VARCHAR(255) UNIQUE | |
| `error_message` | TEXT | |
| `created_at`, `updated_at` | DATETIME | |

---

### `web_business_cards`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT AI PK | |
| `client_id` | INT FK UNIQUE | |
| `title`, `subtitle` | VARCHAR | |
| `header_image_url` | VARCHAR(500) | |
| `phone_1`, `phone_2` | VARCHAR | |
| `address` | TEXT | |
| `location_url` | VARCHAR | |
| `facebook_url`, `instagram_url`, `whatsapp_number` | VARCHAR | |
| `gallery_images` | JSON | Max 10 images |
| `status` | ENUM | draft / generating / published / failed |
| `public_slug` | VARCHAR(255) UNIQUE | |
| `created_at`, `updated_at` | DATETIME | |

---

### `web_scheduled_posts`

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `job_id` | INT FK UNIQUE |
| `client_id` | FK |
| `scheduled_at` | DATETIME |
| `publish_type` | VARCHAR(10) — post / story |
| `status` | ENUM: pending / published / failed / cancelled |
| `error_message` | TEXT |
| `created_at`, `published_at` | DATETIME |

---

### `web_content_plans` + `web_content_plan_items`

**web_content_plans**

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `client_id` | FK→clients CASCADE |
| `web_user_id` | FK→web_users CASCADE |
| `mode` | ENUM: auto / manual |
| `user_prompt` | TEXT |
| `created_at` | DATETIME |

**web_content_plan_items**

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `plan_id` | FK→web_content_plans CASCADE |
| `client_id` | FK |
| `title` | VARCHAR(255) |
| `idea_text` | TEXT |
| `job_type` | ENUM: announcement / product_sale / from_image / before_after |
| `status` | ENUM: draft / approved / created / superseded |
| `job_id` | FK→creative_jobs SET NULL |
| `created_at`, `updated_at` | DATETIME |

---

### `web_design_edit_requests`

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `job_id` | FK→creative_jobs CASCADE |
| `client_id` | FK |
| `user_edit` | TEXT |
| `status` | ENUM: pending / completed / failed / superseded |
| `error_message` | TEXT |
| `result_image_url` | VARCHAR(500) |
| `requested_at`, `completed_at` | DATETIME |

---

### `web_logo_options`

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `client_id` | FK→clients CASCADE |
| `batch_id` | INT |
| `image_url` | VARCHAR(500) |
| `prompt` | TEXT |
| `status` | ENUM: option / approved / superseded |
| `created_at` | DATETIME |

---

### `web_payments`

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `web_user_id` | FK→web_users CASCADE |
| `provider` | ENUM: paypal / sumit |
| `amount` | DECIMAL(10,2) |
| `currency` | VARCHAR(10) DEFAULT 'ILS' |
| `status` | ENUM: success / failed / pending |
| `reference` | VARCHAR(100) |
| `created_at` | DATETIME |

---

### `web_landing_page_leads`

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `landing_page_id` | FK |
| `client_id` | FK |
| `name`, `email`, `phone`, `source_url` | VARCHAR |
| `created_at` | DATETIME |

---

### `web_landing_page_edits`

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `landing_page_id` | FK |
| `client_id` | FK |
| `user_prompt` | TEXT |
| `status` | ENUM: pending / completed / failed |
| `error_message` | TEXT |
| `created_at`, `completed_at` | DATETIME |

---

### `web_deleted_jobs` / `web_deleted_landing_pages`
Soft-delete journals.

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `job_id` / `landing_page_id` | FK |
| `web_user_id` | FK |
| `client_id` | FK |
| `deleted_at` | DATETIME |

---

### `web_referral_codes` / `web_referrals` / `web_user_meta`

**web_referral_codes**

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `user_id` | INT UNIQUE |
| `code` | VARCHAR(32) UNIQUE — 8-char hex |
| `created_at` | DATETIME |

**web_referrals**

| Column | Type |
|--------|------|
| `id` | INT AI PK |
| `referrer_user_id` | INT |
| `referred_user_id` | INT UNIQUE |
| `code` | VARCHAR(32) |
| `status` | VARCHAR(16): pending / rewarded |
| `discount_applied` | TINYINT(1) DEFAULT 0 |
| `rewarded_at` | TIMESTAMP NULL |
| `created_at` | DATETIME |

**web_user_meta**

| Column | Type |
|--------|------|
| `user_id` | INT PK |
| `heard_about` | VARCHAR(64) |
| `referral_code_used` | VARCHAR(32) |
| `created_at` | DATETIME |

---

### Other Tables

| Table | Purpose |
|-------|---------|
| `activity_log` | DAU/WAU/MAU analytics events (`client_id`, `job_id`, `event_type`, `event_data` JSON) |
| `api_keys` | n8n API keys (`key_name`, `key_value`, `is_active`) |
| `leads` | Sales/marketing leads with status workflow |
| `web_manual_leads` | CSV-imported leads per user/brand |

---

## API Endpoints

### Authentication

| File | Method | Action | Description |
|------|--------|--------|-------------|
| `web_auth.php` | POST | `login` | Email/password login; regenerates session |
| `web_auth.php` | POST | `register` | Create user (plan=expired, 0 credits); creates referral code |
| `web_auth.php` | POST | `logout` | Destroys session |
| `web_auth.php` | POST | `me` | Returns session user data, credits, referral code |
| `web_auth.php` | POST | `apply_referral` | Links referral code to current user |
| `web_google_oauth.php` | GET | `?action=start` | Initiates Google OIDC flow |
| `web_google_oauth.php` | GET | `?action=callback` | Exchanges code, creates/links user, redirects to app |

### Brands

| File | Method | Action | Description |
|------|--------|--------|-------------|
| `web_brands.php` | GET | `?client_id=N` | Single brand; omit for full list |
| `web_brands.php` | POST | `create` | Creates client + web_user_clients + web_brand_profiles; calls Gemini to infer brand profile |
| `web_brands.php` | POST | `update_profile` | Updates clients + web_brand_profiles; re-infers via Gemini |
| `web_brands.php` | POST | `delete` | Hard deletes client (cascades) |
| `web_brand_logo.php` | POST | multipart | Uploads logo; extracts dominant colors via GD |
| `web_logo.php` | POST | — | Generates 3 AI logo variants via Gemini |
| `web_user_avatar.php` | POST | multipart | Uploads user avatar |
| `web_meta_oauth.php` | GET | `?client_id=N` | Returns Meta connection status + expiry |
| `web_meta_oauth_complete.php` | GET | callback | Meta OAuth callback; stores long-lived page token |

### Jobs

| File | Method | Action | Description |
|------|--------|--------|-------------|
| `web_jobs.php` | GET | `?client_id=N` | Lists jobs (excluding soft-deleted) with edit_status |
| `web_jobs.php` | GET | `?action=edit_history&job_id=M` | Design edit history |
| `web_jobs.php` | POST | `create` | Creates job; inserts web_multi_products for multi_mode; deducts credits |
| `web_jobs.php` | POST | `cancel` | Sets current_stage=rejected |
| `web_jobs.php` | POST | `reset` | Clears back to await_user_input |
| `web_jobs.php` | POST | `retry_video` | Sets current_stage=generate_video |
| `web_jobs.php` | POST | `delete` | Soft-deletes via web_deleted_jobs |
| `web_edit_design.php` | POST | — | Inserts edit request; dispatches tool_edit_design.php |
| `process_job.php` | POST | `{job_id}` | Dispatches CLI tool based on current_stage |
| `web_publish.php` | POST | `{job_id, publish_type}` | Publishes to Facebook/Instagram via Meta Graph API v18.0 |

### Content Tools

| File | Method | Action | Description |
|------|--------|--------|-------------|
| `web_schedule.php` | GET | `?client_id=N` | Lists scheduled posts |
| `web_schedule.php` | POST | `schedule` | Upserts web_scheduled_posts |
| `web_schedule.php` | POST | `cancel` | Sets status=cancelled |
| `web_content_plan.php` | GET | `?client_id=N` | Returns latest plan + items |
| `web_content_plan.php` | POST | `generate` | Costs 4 text credits; calls Gemini; creates plan + 4 items |
| `web_content_plan.php` | POST | `update_item` | Updates plan item |
| `web_content_plan.php` | POST | `approve_item` | Sets status=approved |
| `web_content_plan.php` | POST | `create_job` | Creates creative_job from approved item |
| `web_landing_pages.php` | GET | `?client_id=N` | Lists landing pages |
| `web_landing_pages.php` | POST | `create` | Generates landing page via Gemini; costs 1 landing credit |
| `web_landing_pages.php` | POST | `edit` | Creates edit request; re-dispatches CLI |
| `web_landing_pages.php` | POST | `delete` | Soft-delete |
| `web_business_cards.php` | GET | `?client_id=N` | Returns card (growth+ plan only) |
| `web_business_cards.php` | POST | `save` | Upsert card with unique slug |
| `web_posts.php` | GET | `?client_id=N` | Scheduled + published posts |
| `web_library.php` | GET | `?client_id=N` | All brand assets (uploads, images, videos, copies) |
| `web_upload_product.php` | POST | multipart | Validates + saves product images |
| `web_leads_import.php` | POST | multipart CSV | Imports up to 500 leads |

### Billing

| File | Method | Action | Description |
|------|--------|--------|-------------|
| `web_paypal.php` | POST | `create_subscription` | Creates PayPal subscription; returns approval_url |
| `web_paypal.php` | POST | `complete` | Activates plan; updates credits; records payment; applies referral discount |
| `web_paypal.php` | POST | `cancel_subscription` | Cancels via PayPal API |
| `web_paypal.php` | POST | `start_paid_now` | Bypasses trial |
| `web_paypal.php` | POST | `apply_retention_offer` | 20% discount plan revision |
| `web_paypal.php` | POST | `create_plans` | Admin: creates PayPal billing plans |
| `web_paypal_webhook.php` | POST | webhook | Handles subscription lifecycle + payment events |
| `web_sumit.php` | POST | `create_subscription` | Israeli billing; updates user to active plan |
| `web_sumit.php` | POST | `cancel_subscription` | Cancels Sumit recurring |

**PayPal webhook events handled:**
- `BILLING.SUBSCRIPTION.ACTIVATED` / `RE-ACTIVATED` / `UPDATED` / `CANCELLED` / `SUSPENDED` / `EXPIRED`
- `PAYMENT.SALE.COMPLETED` → calls `apply_active_plan()` + `apply_referral_rewards()` (+20 text, +20 image, +5 video to referrer)
- `PAYMENT.SALE.DENIED`

### Admin

| File | Method | Description |
|------|--------|-------------|
| `web_admin_users.php` | GET | Rich user listing with stats (payments, referrals, designs, videos, publishing_rate, time_to_first_job, job_types_used) |
| `web_admin_users.php` | POST | create / update users |
| `web_admin_brands.php` | GET | All brands with owner emails + counts |
| `web_admin_metrics.php` | GET | Full SaaS KPIs: MRR, ARR, ARPU, DAU/WAU/MAU, churn, conversion, referral metrics, trends |
| `web_admin_jobs.php` | GET | Job search/listing |
| `web_admin_landing_pages.php` | GET | Landing page listing |
| `web_admin_user_history.php` | GET | Per-user activity history |

### n8n / WhatsApp (API Key Auth)

> Auth: `X-API-Key` header, `Authorization: Bearer`, or `?api_key=` — validated against `api_keys` table

| File | Method | Description |
|------|--------|-------------|
| `webhook.php` | GET | Meta webhook verification (hub.verify_token) |
| `webhook.php` | POST | WhatsApp message processor; creates/looks up clients; handles menu, onboarding, multi_mode product collection |
| `onboarding.php` | POST | 4-step WhatsApp onboarding: logo_uploaded → logo_analyzed → business_described → profile_inferred |
| `jobs.php` | POST | n8n actions: get_job, set_lock, release_lock, save_input, save_design, approve_design, reject_design, save_copy, approve_copy, approve_publish, save_bulk_products, save_reel |
| `publish.php` | POST | n8n-triggered publish using `clients` table tokens (not web_brand_profiles) |
| `get_client_info.php` | POST | n8n client lookup by phone |
| `get_client_info_by_id.php` | POST | n8n client lookup by ID |
| `get_whatsapp_media.php` | POST | n8n media download helper |
| `meta_oauth.php` | GET | WhatsApp-path Meta OAuth initiation |
| `meta_oauth_complete.php` | GET | WhatsApp-path Meta OAuth callback |

### Public Endpoints

| File | Method | Description |
|------|--------|-------------|
| `landing.php` | GET | Renders public landing page by `?slug=` |
| `submit_lead.php` | POST | Lead form submission → web_landing_page_leads |
| `business-card.php` | GET | Renders public business card by slug |
| `web_contact.php` | POST | Contact form submission |

### CLI Tool Scripts (dispatched via `shell_exec`)

| Script | Trigger | Credits | Description |
|--------|---------|---------|-------------|
| `tool_generate_design.php JOB_ID` | generate_design stage | 1 image | Gemini image generation for all design job types |
| `tool_generate_multi_variants.php JOB_ID` | generate_multi_variants stage | 1 image/product | Per-product image swap; preserves template layout |
| `tool_generate_ad_copy.php JOB_ID` | generate_ad_copy stage | 1 text | Gemini vision → describe image → generate {headline,body,cta} |
| `tool_generate_video.php JOB_ID` | generate_video stage | 1 video | KIE veo3_fast async generation + polling (30×10s) |
| `tool_generate_ugc.php JOB_ID` | generate_design (ugc_video type) | 1 video | UGC-style video via KIE + polling (6×10s) |
| `tool_generate_landing_page.php JOB_ID` | create action | 1 landing | Gemini full HTML generation + form injection |
| `tool_edit_design.php JOB_ID EDIT IMAGE_URL MODE` | web_edit_design.php | 1 image | edit mode (EDIT model) or recreate mode (IMAGE model) |
| `tool_edit_copy.php JOB_ID` | copy edit flow | 1 text | Revises existing ad_copy JSON |
| `tool_edit_video.php` | video edit flow | 1 video | Regenerates video via KIE |
| `tool_create_video.php` | alternative path | 1 video | Alternative video creation |

---

## Authentication

### Web Session Auth
- Session name: `adly_web`
- Session storage: `/storage/sessions/`
- Cookie: `secure=true` (HTTPS), `httponly=true`, `samesite=Lax`
- Session fixation: `secure_session_regenerate()` on login, register, and OAuth callback

**Session variables set on login:**
```
web_user_id, web_user_email, web_user_role, web_user_max_brands,
web_user_first_name, web_user_last_name, web_user_avatar_url,
web_user_theme_mode, web_user_plan_tier, web_user_plan_interval,
web_user_subscription_status, web_user_trial_end_at, web_user_plan_end_at,
web_user_credits_remaining, web_user_text_credits, web_user_image_credits,
web_user_video_credits, web_user_landing_credits, web_user_credits_reset_at,
web_user_payment_provider
```

### Google OIDC Flow
1. `GET /api/web_google_oauth.php?action=start` → store state in session → redirect to Google
2. `GET /api/web_google_oauth.php?action=callback&code=&state=` → exchange code → verify id_token → create/link user → redirect to `/ui/app.html`

### n8n API Key Auth
- Checked by `check_api_key()` in config.php
- Accepts: `X-API-Key` header, `Authorization: Bearer`, `?api_key=` query param
- Validated against `api_keys` table

### Admin Auth
- `$_SESSION['web_user_role'] === 'admin'`
- Bypasses brand ownership checks in `ensure_brand_owner()`

---

## Job State Machine

```
                    ┌─────────────────────┐
                    │   await_user_input   │  (multi_mode product collection)
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │       pending        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
   ┌──────────▼───┐  ┌─────────▼──────┐  ┌─────▼────────┐
   │generate_design│  │generate_video  │  │ (ugc_video)  │
   └──────────┬───┘  └────────┬───────┘  └──────────────┘
              │               │
              └───────┬───────┘
                      │
           ┌──────────▼──────────┐
           │ await_design_approval│
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────┐
           │ generate_multi_variants│  (multi_mode only)
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────┐
           │  generate_ad_copy   │
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────┐
           │  await_copy_approval │
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────┐
           │await_publish_approval│
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────┐
           │      publishing      │
           └──────────┬──────────┘
                      │
           ┌──────────▼──────────┐
           │      completed       │
           └─────────────────────┘

           rejected  ← can happen at any stage
```

**Job types:**
`announcement` · `product_sale` · `from_image` · `before_after` · `reel` · `content_strategy` · `ugc_video` · `multi_mode` · `video` · `tips_carousel`

**Processing lock:** `processing_lock=1` + `processing_lock_at` within 5 minutes = job is locked. CLI tools set lock on start, clear on finish/error.

---

## Credit System

Four independent credit pools per `web_users` row:

| Pool | Column | Used By |
|------|--------|---------|
| Text | `text_credits_remaining` | ad copy generation, content plan generation |
| Image | `image_credits_remaining` | design generation, multi-variant generation, design editing |
| Video | `video_credits_remaining` | video generation, UGC video generation |
| Landing | `landing_credits_remaining` | landing page generation |

**Plan limits:**

| Tier | Text | Image | Video | Landing | Max Brands | Price (ILS/mo) |
|------|------|-------|-------|---------|------------|----------------|
| trial | 10 | 10 | 2 | 2 | 1 | free (7 days) |
| starter | 50 | 30 | 5 | 5 | 2 | 179 |
| growth | 100 | 70 | 15 | 15 | 5 | 449 |
| pro | 200 | 150 | 30 | 30 | 15 | 899 |
| agency | 500 | 400 | 80 | 80 | 50 | 1499 |

**Credit reset:** `apply_credit_reset_if_needed()` resets to plan limits on the monthly reset date.

**Referral rewards:** On referree's first payment → referrer gets +20 text, +20 image, +5 video credits.

**Referral discount:** 10% off referred user's first subscription via PayPal plan revision.

---

## External Integrations

### Google Gemini
| Constant | Model slot | Used for |
|----------|------------|---------|
| `GOOGLE_TEXT_MODEL` | e.g. `gemini-2.0-flash-exp` | Text generation, image analysis (vision) |
| `GOOGLE_IMAGE_MODEL` | e.g. `gemini-3-pro-image-preview` | Image generation |
| `GOOGLE_EDIT_IMAGE_MODEL` | e.g. `models/gemini-2.5-flash-image` | Image editing (native edit mode) |

**Functions:** `call_gemini_text()`, `call_gemini_text_with_options(prompt, max_tokens, temperature)`, `call_gemini_text_with_images(prompt, inline_parts)`, `call_gemini_image(prompt, inline_parts, model_override, response_modalities, image_config)`

### KIE API (Video)
- Endpoint: `https://api.kie.ai/api/v1/veo/generate` (POST, async)
- Poll: `https://api.kie.ai/api/v1/veo/record-info?taskId=`
- Model: `veo3_fast`
- Auth: `Authorization: Bearer KIE_API_KEY` + `X-API-Key: KIE_API_KEY`
- Polling: video — up to 30×10s (5 min); UGC — up to 6×10s
- Image resize before payload: 576×1024 (9:16 story) or 512×512 (1:1 post), JPEG ≤80% quality

### Meta Graph API v18.0
**Publishing paths:**
- Single image post: `POST /{page_id}/photos` (Facebook); 2-step createMedia→publish (Instagram)
- Multi-photo carousel: upload each as `published=false`, then `POST /{page_id}/feed` with `attached_media[]`; Instagram carousel container
- Story: `POST /{page_id}/photo_stories` (Facebook); `media_type: STORIES` (Instagram)

**Token sources:**
- Web path (`web_publish.php`): reads from `web_brand_profiles`
- n8n path (`publish.php`): reads from `clients` table

### PayPal
- Subscriptions API for plan management
- Webhook for lifecycle events + payment events
- Retention offer: 20% discount via plan revision
- Referral discount: 10% off first subscription

### Sumit (Israeli Payment Provider)
- Recurring billing API
- Direct charge on `create_subscription`
- Cancel via API

### Google OIDC
- Scopes: `openid email profile`
- Token endpoint: `https://oauth2.googleapis.com/token`
- Verify: `https://oauth2.googleapis.com/tokeninfo?id_token=`

### n8n
- Orchestrates WhatsApp flows and job processing automation
- Calls internal endpoints with API key auth

---

## Frontend Pages

> All files in `/ui/`. Architecture: multi-page SPA with shared shell.

### Shared Infrastructure
| File | Purpose |
|------|---------|
| `shared.js` | `apiRequest()`, `initAppShell()`, `I18N` translations (en/ar/he), `setTheme()`, `setLanguage()`, `getLogoUrl()`, `normalizeUrl()` |
| `app-shell-fragment.html` | Sidebar + header fragment, loaded dynamically by `initAppShell()` |
| `styles.css` | Global stylesheet |
| `icons.svg` | SVG icon sprite (home, library, landing, leads, card, posts, calendar, pricing, book, pencil) |

**Theme system:** `setTheme({primary, secondary, logoUrl, name})` sets CSS variables + sidebar brand logo/name.

**RTL support:** `RTL_LANGS = ['ar', 'he']`; `document.dir` set based on language; `data-i18n` attributes on HTML elements.

**Analytics:** Google Analytics (G-6D6PKSE06T) + Hotjar (hjid: 6550468) on all app pages.

### App Pages

| File | Description |
|------|-------------|
| `app.html` / `app.js` | Creative Studio — main dashboard. Job creation (all 8 types), job list with search/filter, job details panel, design approval, copy approval, publish flow, image modal |
| `login.html` | Email/password + Google OAuth login. Post-login: checks brands, redirects to onboarding if needed |
| `register.html` | Registration. Captures `?referral_code=` and `?heard_about=` params |
| `onboarding.html` | Brand setup — business info, logo upload, social URLs. Admin users get owner_user_id selector |
| `logo-generator.html` | AI logo creation — generates 3 variants, user picks one |
| `profile.html` | Name/theme update, password change, stats, usage history chart, plan limits, retention offer |
| `pricing.html` | Plan tiers, PayPal + Sumit subscription creation |
| `landing-pages.html` / `landing-pages.js` | Landing page list + creation form |
| `brand-library.html` / `brand-library.js` | All generated assets (images, videos, copies, uploads) |
| `brand-posts.html` / `brand-posts.js` | Scheduled + published posts calendar/list |
| `business-card.html` / `business-card.js` | Digital business card editor |
| `content-plan.html` | Content plan generator + manager |
| `leads.html` / `leads.js` | Landing page leads table + CSV import |
| `contact.html` | Contact form |
| `knowledge-base.html` | Help/documentation |

### Admin Pages

| File | Description |
|------|-------------|
| `admin-users.html` | User management table (create, update, view stats) |
| `admin-brands.html` / `admin-brands.js` | All brands with owner info |
| `admin-jobs.html` / `admin-jobs.js` | Job search/listing |
| `admin-landing-pages.html` / `admin-landing-pages.js` | Landing page listing |
| `admin-business-cards.html` / `admin-business-cards.js` | Business cards listing |
| `admin-metrics.html` | SaaS analytics dashboard (MRR, ARR, ARPU, DAU/WAU/MAU, churn, conversion, referral metrics) |

### Public Pages

| File | Description |
|------|-------------|
| `index.html` | Marketing homepage |
| `login.html` | Public login page |
| `register.html` | Public registration page |

---

## Business Logic Notes

### Prompt Architecture (`prompts.php`)
Key prompt builder functions:
- `build_announcement_design_prompt()` — Detects sale/promo/event keywords; adapts visual guidance
- `build_product_design_prompt()` — Product ad with logo at top center
- `build_from_image_prompt()` — User image as base creative
- `build_before_after_prompt()` — Split layout
- `build_multi_swap_prompt()` — Product swap maintaining template layout
- `build_tips_carousel_prompt()` — Multi-slide educational carousel
- `build_logo_prompt()` — Logo with RTL detection
- `build_ad_copy_prompt()` — `{headline, body, cta}` JSON; includes phone/address/website
- `build_ugc_scene_system_prompt()` / `build_ugc_scene_user_prompt()` — UGC video for KIE
- `build_landing_page_prompt()` — Full HTML (4096 tokens, temp 0.7)
- `build_content_plan_prompt()` — 4-item monthly content plan
- `get_logo_protection_rules()` — 7 rules preventing AI from modifying the logo

### Multi-Mode Flow
1. User creates `multi_mode` job; N products inserted into `web_multi_products`
2. Template design generated (`generate_design`)
3. On template approval → `generate_multi_variants`
4. `tool_generate_multi_variants.php` loops rows, calls Gemini with template + each product image
5. Each variant URL saved to `generated_image_url`
6. Proceeds to `generate_ad_copy`
7. Can only publish as post (not story)

### WhatsApp Webhook Flow
1. Incoming WhatsApp message → `webhook.php`
2. Client lookup by phone; create if new
3. If onboarding incomplete → send WhatsApp menu via n8n
4. Commands: `abort#` (delete job), `/new` (close open jobs), `forget#` (reset onboarding)
5. Menu items 1-6 → create `creative_job` with respective `job_type`
6. Multi-mode: collect product images/details via message thread

### Currency Mapping
`get_currency_for_country()` maps country names to currency symbols: ₪ (Israel), ﷼ (Saudi/Gulf), د.إ (UAE), etc.

### Publishing Flow Differences
- **Web users** (`web_publish.php`): tokens from `web_brand_profiles`; Facebook + Instagram in one call
- **n8n/WhatsApp** (`publish.php`): tokens from `clients`; deducts `trial_credits`/`monthly_credits`; increments `content_posts_this_week`
