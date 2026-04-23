import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('meta-oauth')
export class N8nMetaOAuthController {
  constructor(private readonly whatsapp: WhatsappService) {}

  // GET /api/meta-oauth?client_id=X — check token status (no auth required for status check)
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
