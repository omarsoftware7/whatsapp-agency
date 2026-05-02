# Launcho — AI-Powered Social Media Agency via WhatsApp

### Turn a WhatsApp message into a published Facebook & Instagram campaign — in minutes, not hours.

---

## Overview

Launcho is a SaaS platform that lets business owners run social media ad campaigns entirely through WhatsApp. A client sends a product image and a short description via WhatsApp → the AI generates a professional design and ad copy → the client approves each step via chat → the post goes live on Facebook and Instagram automatically.

**[Full User & Developer Documentation →](./DOCS.md)**

---

## Key Features

- **WhatsApp-native workflow** — clients never need to leave WhatsApp to create and publish a campaign
- **AI design generation** — Google Gemini produces branded image variations based on the client's logo, colors, and product photo
- **AI ad copy generation** — headline, body, and CTA tailored to the brand and product
- **Multi-step approval flow** — approve or request edits at each stage (design → copy → publish)
- **One-click publishing** — posts to Facebook Page and Instagram simultaneously via Meta Graph API
- **Web dashboard** — manage clients, view job history, track published posts, manage brand assets
- **Multi-language support** — Hebrew, Arabic, and English

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | NestJS 10 (Node.js), TypeORM, PostgreSQL |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **AI** | Google Gemini 2.0 Flash (text + image generation) |
| **Messaging** | WhatsApp Cloud API (Meta) |
| **Publishing** | Meta Graph API v21 (Facebook + Instagram) |
| **File Storage** | Cloudflare R2 |
| **Automation** | n8n (workflow orchestration) |
| **Deployment** | Railway (backend + frontend) |

---

## Architecture Overview

```
Client (WhatsApp)
      │
      ▼
Meta Webhook → NestJS Backend
      │
      ├─ OrchestratorService (state machine)
      │       │
      │       ├─ IntentService  ──── Gemini API (classify intent)
      │       ├─ DesignService  ──── Gemini API (generate image)
      │       ├─ AdCopyService  ──── Gemini API (generate copy)
      │       └─ MetaService    ──── Meta Graph API (publish)
      │
      ├─ Cloudflare R2 (image storage)
      └─ PostgreSQL (jobs, clients, brand profiles)

Web Dashboard (React) ─── REST API ─── NestJS Backend
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- A Meta Developer App (WhatsApp Business + Facebook Login for Business)
- A Google Cloud project with Gemini API enabled
- A Cloudflare account with R2 bucket

### 1. Clone the repository

```bash
git clone https://github.com/OmarAboRabea1/whatsapp-agency.git
cd whatsapp-agency
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your keys (see Configuration section below)
```

### 3. Install and run the backend

```bash
cd backend
npm install
npm run migration:run   # Set up PostgreSQL schema
npm run start:dev       # Starts on http://localhost:3000
```

### 4. Install and run the frontend

```bash
cd frontend
npm install
npm run dev             # Starts on http://localhost:5173
```

---

## Configuration

Create `backend/.env` with the following variables:

```env
# Server
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=change_me_in_production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/launcho

# Google Gemini (AI)
GEMINI_API_KEY=AIzaSy...
GOOGLE_TEXT_MODEL=gemini-2.0-flash-exp
GOOGLE_IMAGE_MODEL=gemini-3-pro-image-preview

# WhatsApp Cloud API
WA_ACCESS_TOKEN=EAAA...
WA_PHONE_NUMBER_ID=your_phone_number_id
WA_BUSINESS_ACCOUNT_ID=your_business_account_id
META_VERIFY_TOKEN=your_webhook_verify_token

# Meta (Facebook + Instagram publishing)
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_GRAPH_VERSION=v21.0

# Cloudflare R2 (file storage)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_key_id
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET=launcho-uploads
R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

> **Security note:** Never commit your `.env` file. It is already in `.gitignore`.

---

## Project Structure

```
whatsapp-agency/
├── backend/                  # NestJS API server
│   └── src/
│       ├── entities/         # Database models (Client, CreativeJob, WebUser, …)
│       ├── modules/
│       │   ├── webhooks/     # WhatsApp webhook + AI agent pipeline
│       │   │   └── agent/    # OrchestratorService, DesignService, AdCopyService
│       │   ├── meta/         # Facebook / Instagram publishing
│       │   ├── auth/         # Login, register, Google OAuth
│       │   ├── brands/       # Brand profile management
│       │   ├── jobs/         # Creative job CRUD
│       │   ├── payments/     # PayPal + Sumit subscriptions
│       │   └── admin/        # Admin metrics & management
│       └── common/
│           ├── guards/       # SessionGuard, ApiKeyGuard
│           └── services/     # R2Service (file uploads)
├── frontend/                 # React + Vite dashboard
│   └── src/
│       ├── pages/            # Dashboard, BrandLibrary, Leads, ContentPlan, …
│       └── api/              # Typed API client
├── docs/n8n/                 # n8n workflow JSON exports
├── remotion/                 # Video ad generation (Remotion)
└── DOCS.md                   # Full usage documentation
```

---

## Deployment

The project is deployed on **Railway** with two services:

| Service | Build | Start |
|---|---|---|
| Backend | `npm run build` | `node dist/main.js` |
| Frontend | `tsc && vite build` | `serve dist -p $PORT -s` |

Set all environment variables in the Railway service settings. PostgreSQL is provisioned as a Railway addon.

---

## Demo

> Watch the demo: [YouTube link coming soon]

---

Developed as part of the **Generative AI Developer Growth Lab — Place-IL**
