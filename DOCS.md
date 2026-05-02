# Launcho — Full Documentation

> How to set up, configure, and use the Launcho platform end-to-end.

---

## Table of Contents

1. [How the Platform Works](#1-how-the-platform-works)
2. [Web Dashboard Guide](#2-web-dashboard-guide)
3. [WhatsApp Agent Guide (Client Flow)](#3-whatsapp-agent-guide-client-flow)
4. [Connecting Facebook & Instagram](#4-connecting-facebook--instagram)
5. [Setting Up WhatsApp Webhook](#5-setting-up-whatsapp-webhook)
6. [Admin Panel](#6-admin-panel)
7. [Subscription Plans & Credits](#7-subscription-plans--credits)
8. [API Reference](#8-api-reference)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. How the Platform Works

Launcho has two sides:

| Side | Who uses it | What it does |
|---|---|---|
| **Web Dashboard** | Agency owner (you) | Create brands, manage clients, view published posts, track jobs |
| **WhatsApp Agent** | Your clients | Send a product → get a designed post → approve it → goes live |

The full campaign creation flow:

```
1. Client sends WhatsApp message:
   "I want to promote my new coffee blend, 20% off this weekend"
   + (optional) product photo

2. AI classifies intent → creates a new CreativeJob

3. DesignService calls Gemini:
   → Generates 3 branded image variations
   → Sends previews back to client via WhatsApp

4. Client replies: ✅ (approve design #2) or "make it more colorful"

5. AdCopyService calls Gemini:
   → Generates headline, body copy, CTA in the client's language
   → Sends copy preview to client

6. Client replies: ✅ (approve copy)

7. Instagram preview is generated and sent for final confirmation

8. Client replies: ✅ (publish now)

9. MetaService publishes simultaneously to:
   → Facebook Page (photo post + caption)
   → Instagram Business Account (image + caption)

10. Client receives: "✅ Your post is live on Facebook and Instagram!"
```

---

## 2. Web Dashboard Guide

### Registration & Login

1. Go to your frontend URL (e.g., `https://app.omar-software.com`)
2. Click **Register** and create your agency account
3. On first login you will be taken through **Onboarding** to set up your agency profile

### Dashboard — Managing Jobs

The **Dashboard** is the main page. It shows all creative jobs across your clients.

- Each job card shows: client name, job type, current stage, and timestamps
- Click a job to see the full details: design variations, ad copy, publish status
- Stage badges show where the job is in the pipeline:
  - `await_user_input` → waiting for client to send details
  - `generate_design` → AI is creating the image
  - `await_design_approval` → client reviewing design
  - `generate_ad_copy` → AI writing the copy
  - `await_copy_approval` → client reviewing copy
  - `await_publish_approval` → client confirming final post
  - `publishing` → posting to Meta
  - `completed` → live on Facebook/Instagram

### Brand Library

Upload and manage brand assets for each client:
- Logo files
- Brand color palettes
- Past designs and templates
- Product images

### Content Plan

Plan upcoming campaigns for each brand. Set dates, topics, and campaign types. The WhatsApp agent will use this context when generating content.

### Brand Posts

View all published posts across all clients. Shows:
- Design image used
- Caption that was posted
- Facebook Post ID and Instagram Post ID
- Date published

### Leads

Collect and manage leads generated from Instagram/Facebook posts or landing pages.

### Landing Pages

Build simple landing pages for client campaigns. Pages are hosted on your domain.

### Business Card

Generate digital business cards for clients.

### Profile & Billing

Manage your account details and subscription plan. Connect PayPal for payment.

---

## 3. WhatsApp Agent Guide (Client Flow)

This is the experience your **clients** have — entirely inside WhatsApp.

### First Message (Onboarding)

When a client messages the WhatsApp number for the first time, the agent sends:

```
Welcome to Launcho! 🎉
To create your first campaign, I need a few details:
1. What is your business name?
2. What is your main color? (e.g. #FF5733 or "blue")
3. Send me your logo (optional)
```

The client responds naturally. The agent stores this as a brand profile.

### Creating a Campaign

After onboarding, the client can start a campaign any time:

```
Client: "I want to promote my summer sale, 30% off all shoes"
        [attaches product photo]

Agent:  "Great! Generating 3 design options for you... 🎨"
        [sends 3 image variations]
        "Which design do you like? Reply 1, 2, or 3.
         Or reply 'redo' to generate new options."

Client: "2"

Agent:  "Here's the ad copy I wrote for you:
         📢 Headline: Step Into Summer — 30% Off All Shoes!
         📝 Body: This weekend only, treat yourself to the shoes you've been
                  eyeing. Limited sizes available.
         🔗 CTA: Shop Now
         
         Reply ✅ to approve or send your edits."

Client: "✅"

Agent:  [sends Instagram preview]
        "Your post is ready! Reply ✅ to publish now, or 📅 + date to schedule."

Client: "✅"

Agent:  "✅ Published! Your post is live on Facebook and Instagram."
```

### Supported Commands (during a job)

| Reply | Action |
|---|---|
| `1` / `2` / `3` | Select design variation |
| `✅` | Approve current step |
| `redo` | Regenerate designs |
| Any text | Treated as an edit request (e.g. "make the text bigger") |
| `menu` | See available actions |

### Job Types

The agent understands different campaign types:

| Type | Description |
|---|---|
| `announcement` | General business announcement |
| `product_sale` | Product promotion with discount |
| `reel` | Short video ad |
| `ugc_video` | User-generated content video |
| `content_strategy` | Multi-post content plan |

---

## 4. Connecting Facebook & Instagram

Each client needs to connect their Facebook Page and Instagram Business Account once. This happens via OAuth.

### Setup Steps (Agency Owner)

1. In the Meta Developer Portal, set up **Facebook Login for Business** on your app
2. Add these permissions to your FLfB configuration:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `instagram_basic`
   - `instagram_content_publish`
3. Set `META_CONFIG_ID` in your Railway env vars (get the ID from FLfB Settings)

### Client OAuth Flow

1. The client visits: `https://your-api-domain.com/api/meta/oauth/start?client_id=PHONE_NUMBER`
2. They log in with Facebook and grant the required permissions
3. Tokens are stored in the database against the client's record
4. All future posts for this client will use their Page token

> The WhatsApp agent sends this OAuth link automatically when a client tries to publish and no token is found.

### Verifying Connection

You can check a client's connection status from the Admin panel → Clients → select client → Meta Status.

---

## 5. Setting Up WhatsApp Webhook

### In Meta Developer Portal

1. Go to your app → WhatsApp → Configuration
2. Set **Webhook URL** to: `https://your-api-domain.com/api/webhooks/whatsapp`
3. Set **Verify Token** to the value of your `META_VERIFY_TOKEN` env var
4. Subscribe to the `messages` webhook field

### Testing the Webhook

```bash
# Verify the webhook responds to GET (Meta verification check)
curl "https://your-api-domain.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Should return: test123
```

### Phone Number Setup

1. In WhatsApp → Phone Numbers → add and verify your business phone number
2. Copy the **Phone Number ID** → set as `WA_PHONE_NUMBER_ID`
3. Generate a **Permanent Access Token** → set as `WA_ACCESS_TOKEN`

---

## 6. Admin Panel

Access at `/admin` (requires admin role).

### Metrics Dashboard

- Total users, brands, jobs
- Jobs by stage (pipeline health)
- Published posts this week/month
- Revenue and subscription stats

### User Management

- View all registered users
- Change subscription plan
- Add/remove admin role
- View job history per user

### Brand Management

- View all brands across all users
- Edit brand settings
- View associated clients

### Job Management

- View all jobs with full details
- Manually advance/reset a job stage
- View error logs for failed jobs

---

## 7. Subscription Plans & Credits

| Plan | Monthly Credits | Price |
|---|---|---|
| Trial | 5 | Free |
| Starter | 20 | — |
| Growth | 100 | — |
| Pro | 250 | — |
| Agency | 500 | — |

- Each campaign job costs **1 credit**
- Credits reset monthly on the subscription renewal date
- Trial credits are separate from paid credits
- Payment via PayPal (monthly or yearly)

---

## 8. API Reference

All endpoints are prefixed with `/api`.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login with email + password |
| `POST` | `/api/auth/register` | Register new user |
| `GET` | `/api/auth/google` | Start Google OAuth |
| `POST` | `/api/auth/logout` | End session |
| `GET` | `/api/auth/me` | Get current user |

### WhatsApp Webhook

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/webhooks/whatsapp` | Meta webhook verification |
| `POST` | `/api/webhooks/whatsapp` | Receive WhatsApp messages |

### Jobs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobs` | List all jobs for current user |
| `GET` | `/api/jobs/:id` | Get single job with full details |
| `PATCH` | `/api/jobs/:id` | Update job (stage, notes, etc.) |

### Brands

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/brands` | List brands for current user |
| `POST` | `/api/brands` | Create new brand |
| `PATCH` | `/api/brands/:id` | Update brand |

### Meta OAuth

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/meta/oauth/start` | Start Facebook OAuth (query: `client_id`) |
| `GET` | `/api/meta/oauth/callback` | OAuth callback (auto-handled) |

### Files

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/files/*` | Serve uploaded files (public) |

### Admin (requires admin role)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/metrics` | Platform-wide stats |
| `GET` | `/api/admin/users` | All users |
| `GET` | `/api/admin/brands` | All brands |
| `GET` | `/api/admin/jobs` | All jobs |

---

## 9. Environment Variables Reference

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `WA_ACCESS_TOKEN` | WhatsApp Cloud API access token |
| `WA_PHONE_NUMBER_ID` | WhatsApp phone number ID |
| `META_VERIFY_TOKEN` | Webhook verification token (you choose this) |
| `META_APP_ID` | Meta app ID |
| `META_APP_SECRET` | Meta app secret |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET` | R2 bucket name |
| `R2_PUBLIC_URL` | Public URL for R2 bucket |
| `SESSION_SECRET` | Random string for session encryption |

### Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `FRONTEND_URL` | — | Frontend URL (for CORS) |
| `UPLOADS_DIR` | `./uploads` | Local file storage fallback |
| `META_CONFIG_ID` | — | FLfB config ID (enables `config_id` OAuth) |
| `META_GRAPH_VERSION` | `v21.0` | Meta Graph API version |
| `GOOGLE_TEXT_MODEL` | `gemini-2.0-flash-exp` | Gemini model for text |
| `GOOGLE_IMAGE_MODEL` | `gemini-3-pro-image-preview` | Gemini model for images |
| `MOCK_AI` | `false` | Set `true` to mock AI in dev/testing |
| `OPENAI_API_KEY` | — | OpenAI key (optional fallback) |

---

## 10. Troubleshooting

### WhatsApp messages not received

- Check Railway logs for errors on `/api/webhooks/whatsapp`
- Verify the webhook is subscribed to `messages` in Meta Developer Portal
- Confirm `META_VERIFY_TOKEN` matches between your `.env` and Meta portal
- Make sure your backend URL is publicly accessible (not localhost)

### Instagram publishing fails

- Ensure the client completed the Meta OAuth flow with Instagram permissions
- The Instagram account must be a **Business** or **Creator** account (not personal)
- The Facebook Page must be connected to the Instagram account in Facebook settings
- Check Railway logs for `Instagram publish error` to see the exact API error

### Facebook OAuth "Feature Unavailable"

- Your app needs a **Privacy Policy URL** set in Meta App Settings → Basic
- Set `META_CONFIG_ID` if you are using Facebook Login for Business
- If your business is not verified, add testers in App Roles → Roles → Add People

### Images not showing in WhatsApp/Instagram

- Check that `R2_PUBLIC_URL` is set correctly and the bucket is public
- Verify the file exists at the R2 URL by opening it in a browser

### Frontend shows blank page or 502

- Check that `VITE_API_BASE` in the frontend Railway service points to your backend URL
- Ensure `serve` is in `devDependencies` in `frontend/package.json`
- Check that the `start` script in `frontend/package.json` is `serve dist -p ${PORT:-3000} -s`

### Job stuck at `generate_design`

- Check Gemini API key is valid and has quota remaining
- Look for `DesignService error` in Railway logs
- Set `MOCK_AI=true` temporarily to test the pipeline without real AI calls

---

*Launcho — by Omar-Software*
