import { Controller, Get, Query, Param, ParseIntPipe, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionGuard } from '../../common/guards/session.guard';
import { MetaService } from './meta.service';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';

@Controller('brands')
@UseGuards(SessionGuard)
export class MetaOAuthController {
  constructor(
    private readonly meta: MetaService,
    private readonly config: ConfigService,
    @InjectRepository(WebBrandProfile) private profileRepo: Repository<WebBrandProfile>,
  ) {}

  @Get(':id/meta-status')
  status(@Param('id', ParseIntPipe) id: number) {
    return this.meta.getOAuthStatus(id);
  }

  @Get(':id/meta-oauth/start')
  startOAuth(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Res() res: any) {
    req.session.meta_oauth_client_id = id;
    const appId = this.config.get('META_APP_ID');
    const redirectUri = `${this.config.get('FRONTEND_URL')}/api/brands/${id}/meta-oauth/callback`;
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish',
      response_type: 'code',
    });
    res.redirect(`https://www.facebook.com/dialog/oauth?${params}`);
  }

  @Get(':id/meta-oauth/callback')
  async callback(@Param('id', ParseIntPipe) id: number, @Query('code') code: string, @Res() res: any) {
    const redirectUri = `${this.config.get('FRONTEND_URL')}/api/brands/${id}/meta-oauth/callback`;
    const tokens = await this.meta.exchangeCodeForToken(code, redirectUri);

    let profile = await this.profileRepo.findOne({ where: { client_id: id } });
    if (!profile) profile = this.profileRepo.create({ client_id: id });
    profile.meta_page_id = tokens.pageId;
    profile.meta_page_token = tokens.pageToken;
    profile.meta_page_token_expires = tokens.expires;
    profile.instagram_account_id = tokens.igAccountId;
    profile.meta_tokens_valid = true;
    await this.profileRepo.save(profile);

    res.redirect(`/app?meta_connected=1&brand=${id}`);
  }
}
