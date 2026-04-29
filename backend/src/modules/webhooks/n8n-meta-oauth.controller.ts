import { Controller, Get, Post, Body, Query, Res, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

// Encode clientId into an opaque URL-safe token so the raw DB id is never
// visible to end-users in WhatsApp links.
export function signOAuthToken(clientId: number, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ id: clientId, ts: Date.now() })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 22);
  return `${payload}.${sig}`;
}

export function verifyOAuthToken(token: string, secret: string): number {
  const dot = token.lastIndexOf('.');
  if (dot === -1) throw new Error('Invalid token');
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(payload).digest('base64url').slice(0, 22);
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('Invalid token signature');
  const { id, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString());
  // Tokens expire after 24 hours
  if (Date.now() - ts > 86_400_000) throw new Error('Token expired');
  return Number(id);
}

@Controller('meta-oauth')
export class N8nMetaOAuthController {
  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  // GET /api/meta-oauth?client_id=X — check token status (no auth required)
  @Get()
  async getStatus(@Query('client_id') clientIdStr: string) {
    if (!clientIdStr) throw new BadRequestException('client_id required');
    const clientId = parseInt(clientIdStr);
    try {
      return this.whatsapp.getMetaStatus(clientId);
    } catch (e: any) {
      throw new NotFoundException(e.message);
    }
  }

  // POST /api/meta-oauth — save tokens (called after OAuth or manually)
  @Post()
  @UseGuards(ApiKeyGuard)
  async saveTokens(@Body() body: any) {
    const clientId: number = parseInt(body.client_id);
    const pageToken: string = body.page_token;
    const pageId: string = body.page_id;
    const igAccountId: string | null = body.instagram_account_id ?? null;
    const tokenExpires: number | null = body.token_expires ?? null;

    if (!clientId || !pageToken || !pageId) throw new BadRequestException('client_id, page_token, and page_id required');
    return this.whatsapp.saveMetaTokens(clientId, pageToken, pageId, igAccountId, tokenExpires);
  }
}

@Controller('privacy-policy')
export class PrivacyPolicyController {
  @Get()
  getPolicy(@Res() res: any) {
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy — Launcho</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333;line-height:1.6}h1{color:#1a1a1a}h2{color:#444;margin-top:32px}a{color:#2563eb}</style>
</head>
<body>
<h1>Privacy Policy</h1>
<p><strong>Last updated:</strong> April 2026</p>
<p>Launcho ("we", "our", or "us") operates a WhatsApp-based marketing automation service. This policy explains how we collect, use, and protect your information.</p>
<h2>Information We Collect</h2>
<ul>
<li>WhatsApp phone number and name when you message us</li>
<li>Business information you provide (name, logo, description)</li>
<li>Facebook Page and Instagram account tokens when you connect via OAuth</li>
<li>Content you submit for ad creation (images, text)</li>
</ul>
<h2>How We Use Your Information</h2>
<ul>
<li>To generate and publish social media content on your behalf</li>
<li>To manage your connected Facebook Pages and Instagram accounts</li>
<li>To improve our service</li>
</ul>
<h2>Data Storage</h2>
<p>Your data is stored securely. Facebook and Instagram access tokens are stored encrypted and used only to publish content you have explicitly approved.</p>
<h2>Third-Party Services</h2>
<p>We use the Meta (Facebook/Instagram) Graph API to publish content. Your use is also subject to <a href="https://www.facebook.com/policy.php">Meta's Privacy Policy</a>.</p>
<h2>Your Rights</h2>
<p>You may request deletion of your data at any time by contacting us via WhatsApp or at <a href="mailto:aborabeeomar@gmail.com">aborabeeomar@gmail.com</a>.</p>
<h2>Contact</h2>
<p>Email: <a href="mailto:aborabeeomar@gmail.com">aborabeeomar@gmail.com</a></p>
</body></html>`);
  }
}

// Handles /api/meta-oauth-complete?action=start&client_id=X
// Mirrors meta_oauth_complete.php exactly:
//   start    → show HTML page with "Connect" button
//   callback → exchange code, get page token + IG account, save to DB, show success page
@Controller('meta-oauth-complete')
export class MetaOAuthCompleteController {
  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async handleOAuth(
    @Query('action') action: string,
    @Query('client_id') clientIdStr: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: any,
  ) {
    const appId      = this.config.get('META_APP_ID');
    const appSecret  = this.config.get('META_APP_SECRET');
    const baseUrl    = this.config.get('API_BASE_URL', '');
    const graphVer   = this.config.get('META_GRAPH_VERSION', 'v21.0');
    const callbackUrl = `${baseUrl}/api/meta-oauth-complete?action=callback`;

    // ── STEP 1: Redirect directly to Facebook OAuth ──────────────────────────
    if (action === 'start') {
      // Accept either signed ?token= (from WhatsApp links) or raw ?client_id= (internal/admin)
      const oauthSecret = appSecret || 'fallback-secret';
      let resolvedClientId: string;
      const tokenParam = (res.req?.query?.token as string) ?? '';
      if (tokenParam) {
        try {
          resolvedClientId = String(verifyOAuthToken(tokenParam, oauthSecret));
        } catch {
          return res.status(400).send('Invalid or expired link. Please request a new one.');
        }
      } else if (clientIdStr) {
        resolvedClientId = clientIdStr;
      } else {
        return res.status(400).send('Missing token');
      }

      // Encode client_id in state only — never expose it in the URL shown to users
      const stateParam = Buffer.from(JSON.stringify({ client_id: resolvedClientId, ts: Date.now() })).toString('base64');

      const configId = this.config.get('META_CONFIG_ID');
      const oauthParams: Record<string, string> = {
        client_id: appId,
        redirect_uri: callbackUrl,
        state: stateParam,
        response_type: 'code',
      };
      if (configId) {
        // Facebook Login for Business uses config_id instead of scope
        oauthParams.config_id = configId;
      } else {
        oauthParams.scope = [
          'pages_show_list', 'pages_read_engagement', 'pages_manage_posts',
          'pages_manage_engagement', 'instagram_basic', 'instagram_content_publish',
          'business_management',
        ].join(',');
      }

      const oauthUrl = `https://www.facebook.com/${graphVer}/dialog/oauth?` + new URLSearchParams(oauthParams).toString();

      return res.redirect(oauthUrl);
    }

    // ── STEP 2: OAuth callback — exchange code, save to DB ───────────────────
    if (action === 'callback') {
      if (error) {
        return res.send(`
          <html><body style="font-family:sans-serif;padding:40px;text-align:center">
            <h1>❌ Authorization Cancelled</h1>
            <p>Error: ${error}</p>
          </body></html>
        `);
      }

      if (!code || !state) return res.status(400).send('Invalid callback — missing code or state');

      let clientId: number;
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        clientId = parseInt(stateData.client_id);
      } catch {
        return res.status(400).send('Invalid state parameter');
      }

      try {
        // Exchange code for short-lived user token
        const tokenRes = await axios.get(`https://graph.facebook.com/${graphVer}/oauth/access_token`, {
          params: { client_id: appId, client_secret: appSecret, redirect_uri: callbackUrl, code },
        });
        const shortToken: string = tokenRes.data.access_token;

        // Get pages — page.access_token is already a long-lived page token
        const pagesRes = await axios.get(`https://graph.facebook.com/${graphVer}/me/accounts`, {
          params: { access_token: shortToken },
        });
        const pages: any[] = pagesRes.data.data ?? [];
        if (pages.length === 0) return res.status(400).send('No Facebook pages found on this account');

        const page      = pages[0];
        const pageToken = page.access_token as string;
        const pageId    = page.id as string;
        const pageName  = page.name as string;

        // Get Instagram business account linked to this page
        let igAccountId: string | null = null;
        try {
          const igRes = await axios.get(`https://graph.facebook.com/${graphVer}/${pageId}`, {
            params: { fields: 'instagram_business_account', access_token: pageToken },
          });
          igAccountId = igRes.data.instagram_business_account?.id ?? null;
        } catch { /* page may not have IG linked */ }

        // Page tokens don't expire unless password changed or app revoked.
        // Store +60 days as a soft reminder — same as PHP version.
        const tokenExpires = Math.floor(Date.now() / 1000) + 60 * 86400;

        // ── Save to DB (mirrors PHP UPDATE clients SET ... WHERE id = ?) ─────
        await this.whatsapp.saveMetaTokens(clientId, pageToken, pageId, igAccountId, tokenExpires);

        return res.send(`
          <html>
          <head>
            <style>
              body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;text-align:center;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;margin:0}
              .card{background:#fff;border-radius:20px;padding:40px;max-width:500px;margin:50px auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
              h1{color:#2d3748;margin-bottom:20px}
              .icon{font-size:80px;margin-bottom:20px}
              .details{background:#f7fafc;border-radius:10px;padding:20px;margin:20px 0;text-align:left}
              .row{padding:8px 0;border-bottom:1px solid #e2e8f0;display:flex;gap:12px}
              .row:last-child{border-bottom:none}
              .label{font-weight:700;color:#4a5568;width:120px;flex-shrink:0}
              .value{color:#2d3748}
              p.note{color:#718096;font-size:14px;margin-top:24px}
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">✅</div>
              <h1>Successfully Connected!</h1>
              <p>Your Facebook page is now connected.</p>
              <div class="details">
                <div class="row"><span class="label">Page</span><span class="value">${pageName}</span></div>
                <div class="row"><span class="label">Page ID</span><span class="value">${pageId}</span></div>
                <div class="row"><span class="label">Instagram</span><span class="value">${igAccountId ? '✅ Connected' : '❌ Not linked'}</span></div>
                <div class="row"><span class="label">Status</span><span class="value">Ready to post!</span></div>
              </div>
              <p class="note">You can close this window and return to WhatsApp to complete publishing.</p>
            </div>
          </body>
          </html>
        `);
      } catch (e: any) {
        return res.status(500).send(`OAuth error: ${e.response?.data?.error?.message ?? e.message}`);
      }
    }

    return res.status(400).send('Invalid request');
  }
}
