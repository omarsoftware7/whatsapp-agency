import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
import { CreativeJob } from '../../entities/creative-job.entity';

@Injectable()
export class MetaService {
  private readonly graphBase: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(WebBrandProfile) private profileRepo: Repository<WebBrandProfile>,
  ) {
    this.graphBase = `https://graph.facebook.com/${config.get('META_GRAPH_VERSION', 'v18.0')}`;
  }

  async getOAuthStatus(clientId: number) {
    const profile = await this.profileRepo.findOne({ where: { client_id: clientId } });
    if (!profile) return { connected: false };

    const expiresSoon = profile.meta_page_token_expires
      ? (profile.meta_page_token_expires.getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000
      : false;

    return {
      connected: profile.meta_tokens_valid,
      page_id: profile.meta_page_id,
      instagram_account_id: profile.instagram_account_id,
      expires_at: profile.meta_page_token_expires,
      expires_soon: expiresSoon,
    };
  }

  async publish(job: CreativeJob, publishType: 'post' | 'story', profile: WebBrandProfile) {
    if (!profile.meta_page_token || !profile.meta_page_id) {
      throw new BadRequestException('Meta not connected for this brand');
    }

    const imageUrls: string[] = job.design_variations || [];
    const approvedUrl = imageUrls[job.approved_design_index ?? 0];
    const adCopy = job.ad_copy ? JSON.parse(job.ad_copy) : {};
    const caption = [adCopy.headline, adCopy.body, adCopy.cta].filter(Boolean).join('\n\n');

    const fbPostId = await this.publishFacebook(profile.meta_page_id, profile.meta_page_token, approvedUrl, caption, publishType);
    const igPostId = await this.publishInstagram(profile.meta_page_id, profile.meta_instagram_account_id(profile), profile.meta_page_token, approvedUrl, caption, publishType);

    return { facebook_post_id: fbPostId, instagram_post_id: igPostId };
  }

  private async publishFacebook(pageId: string, token: string, imageUrl: string, message: string, type: string) {
    if (type === 'story') {
      const res = await axios.post(`${this.graphBase}/${pageId}/photo_stories`, {
        url: imageUrl,
        access_token: token,
      });
      return res.data.post_id;
    }
    const res = await axios.post(`${this.graphBase}/${pageId}/photos`, {
      url: imageUrl,
      message,
      access_token: token,
    });
    return res.data.post_id;
  }

  private async publishInstagram(pageId: string, igAccountId: string, token: string, imageUrl: string, caption: string, type: string) {
    if (!igAccountId) return null;
    const mediaType = type === 'story' ? 'STORIES' : 'IMAGE';
    const createRes = await axios.post(`${this.graphBase}/${igAccountId}/media`, {
      image_url: imageUrl,
      caption,
      media_type: mediaType,
      access_token: token,
    });
    const containerId = createRes.data.id;
    await this.sleep(3000);
    const publishRes = await axios.post(`${this.graphBase}/${igAccountId}/media_publish`, {
      creation_id: containerId,
      access_token: token,
    });
    return publishRes.data.id;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{ pageId: string; pageToken: string; igAccountId: string; expires: Date }> {
    const appId = this.config.get('META_APP_ID');
    const appSecret = this.config.get('META_APP_SECRET');

    const shortRes = await axios.get(`${this.graphBase}/oauth/access_token`, {
      params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
    });
    const shortToken = shortRes.data.access_token;

    const longRes = await axios.get(`${this.graphBase}/oauth/access_token`, {
      params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: shortToken },
    });
    const longToken = longRes.data.access_token;

    const pagesRes = await axios.get(`${this.graphBase}/me/accounts`, {
      params: { access_token: longToken },
    });
    const page = pagesRes.data.data[0];
    if (!page) throw new BadRequestException('No Facebook pages found');

    const igRes = await axios.get(`${this.graphBase}/${page.id}`, {
      params: { fields: 'instagram_business_account', access_token: page.access_token },
    });
    const igId = igRes.data.instagram_business_account?.id ?? null;

    const expires = new Date();
    expires.setDate(expires.getDate() + 60);

    return { pageId: page.id, pageToken: page.access_token, igAccountId: igId, expires };
  }

  private sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}

// Hack: extend WebBrandProfile inline to avoid circular dep
declare module '../../entities/web-brand-profile.entity' {
  interface WebBrandProfile {
    meta_instagram_account_id(self: WebBrandProfile): string;
  }
}
WebBrandProfile.prototype['meta_instagram_account_id'] = function (self: WebBrandProfile) {
  return self.instagram_account_id;
};
