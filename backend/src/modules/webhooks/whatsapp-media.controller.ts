import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';
import { R2Service } from '../../common/services/r2.service';
import axios from 'axios';

@Controller('get-whatsapp-media')
@UseGuards(ApiKeyGuard)
export class WhatsappMediaController {
  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
    private readonly r2: R2Service,
  ) {}

  @Post()
  async getMedia(@Body() body: any) {
    const mediaId: string = body.media_id;
    const saveToServer: boolean = body.save_to_server !== false;
    let filename: string | null = body.filename ?? null;

    if (!mediaId) throw new BadRequestException('media_id required');

    const waToken = this.config.get('WA_ACCESS_TOKEN');
    const graphVersion = this.config.get('META_GRAPH_VERSION', 'v18.0');


    // Step 1: get media URL
    const urlRes = await axios.get(`https://graph.facebook.com/${graphVersion}/${mediaId}`, {
      headers: { Authorization: `Bearer ${waToken}` },
    });
    const downloadUrl: string = urlRes.data.url;
    const mimeType: string = urlRes.data.mime_type || 'image/jpeg';

    // Step 2: download file
    const fileRes = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${waToken}` },
      responseType: 'arraybuffer',
    });
    const fileData = Buffer.from(fileRes.data);

    if (!saveToServer) {
      return { status: 'success', media_id: mediaId, mime_type: mimeType, base64_data: fileData.toString('base64'), file_size: fileData.length };
    }

    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
      'image/webp': 'webp', 'video/mp4': 'mp4', 'image/gif': 'gif',
      'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf',
    };
    const ext = extMap[mimeType] ?? 'bin';
    const safeFilename = filename
      ? filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '')
      : `whatsapp_${Date.now()}_${mediaId}.${ext}`;
    const finalFilename = safeFilename.includes('.') ? safeFilename : `${safeFilename}.${ext}`;

    const subdir = mimeType.startsWith('video/') ? 'generated' : mimeType.startsWith('image/') ? 'products' : '';
    const publicUrl = mimeType.startsWith('image/')
      ? await this.r2.uploadAsPng(subdir, finalFilename, fileData)
      : await this.r2.upload(this.r2.buildKey(subdir, finalFilename), fileData, mimeType);

    return { status: 'success', media_id: mediaId, mime_type: mimeType, filename: finalFilename, public_url: publicUrl, file_size: fileData.length };
  }
}
