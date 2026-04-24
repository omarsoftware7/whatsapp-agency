import { Controller, Get, Post, Body, Query, Res, UseGuards, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('meta-oauth')
export class N8nMetaOAuthController {
  private readonly logger = new Logger(N8nMetaOAuthController.name);

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

  // POST /api/meta-oauth — save tokens (n8n calls after OAuth)
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

// Handles /api/meta-oauth-complete?action=start&client_id=X (OAuth redirect flow sent to clients)
@Controller('meta-oauth-complete')
export class MetaOAuthCompleteController {
  private readonly logger = new Logger(MetaOAuthCompleteController.name);

  constructor(private readonly config: ConfigService) {}

  @Get()
  async handleOAuth(@Query('action') action: string, @Query('client_id') clientIdStr: string, @Query('code') code: string, @Query('state') state: string, @Res() res: any) {
    const appId = this.config.get('META_APP_ID');
    const appSecret = this.config.get('META_APP_SECRET');
    const baseUrl = this.config.get('API_BASE_URL', '');
    const callbackUrl = `${baseUrl}/api/meta-oauth-complete`;

    if (action === 'start') {
      if (!clientIdStr) return res.status(400).send('client_id required');
      const scope = 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish';
      const fbOAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${scope}&state=${clientIdStr}&response_type=code`;
      return res.redirect(fbOAuthUrl);
    }

    // OAuth callback — exchange code for token
    if (code && state) {
      const clientId = parseInt(state);
      try {
        const axios = (await import('axios')).default;

        // Exchange code for short-lived token
        const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: { client_id: appId, client_secret: appSecret, redirect_uri: callbackUrl, code },
        });
        const shortToken: string = tokenRes.data.access_token;

        // Exchange for long-lived token
        const longRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken },
        });
        const longToken: string = longRes.data.access_token;
        const expiresIn: number = longRes.data.expires_in ?? 5183944;

        // Get pages
        const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
          params: { access_token: longToken },
        });
        const pages: any[] = pagesRes.data.data ?? [];
        if (pages.length === 0) return res.status(400).send('No Facebook pages found');
        const page = pages[0];
        const pageToken: string = page.access_token;
        const pageId: string = page.id;

        // Get Instagram account linked to page
        let igAccountId: string | null = null;
        try {
          const igRes = await axios.get(`https://graph.facebook.com/v18.0/${pageId}`, {
            params: { fields: 'instagram_business_account', access_token: pageToken },
          });
          igAccountId = igRes.data.instagram_business_account?.id ?? null;
        } catch (_) {}

        // Build a WhatsappService-like save using the repository directly
        // We return JSON here and n8n can pick it up, or we can redirect to a success page
        const tokenExpires = Math.floor(Date.now() / 1000) + expiresIn;
        return res.json({
          status: 'authorized',
          client_id: clientId,
          page_id: pageId,
          page_token: pageToken,
          instagram_account_id: igAccountId,
          token_expires: tokenExpires,
          message: 'Authorization successful! You can now publish to Facebook & Instagram.',
        });
      } catch (e: any) {
        this.logger.error('Meta OAuth callback failed', e?.response?.data ?? e?.message);
        return res.status(500).send('OAuth authorization failed. Please try again.');
      }
    }

    return res.status(400).send('Invalid request');
  }
}
