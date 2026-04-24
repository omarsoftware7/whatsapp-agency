import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Controller('get-whatsapp-media')
@UseGuards(ApiKeyGuard)
export class WhatsappMediaController {
  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async getMedia(@Body() body: any) {
    const mediaId: string = body.media_id;
    const saveToServer: boolean = body.save_to_server !== false;
    let filename: string | null = body.filename ?? null;

    if (!mediaId) throw new BadRequestException('media_id required');

    const waToken = this.config.get('WA_ACCESS_TOKEN');
    const graphVersion = this.config.get('META_GRAPH_VERSION', 'v18.0');
    const uploadsDir = this.config.get('UPLOADS_DIR', './uploads');
    const baseUrl = this.config.get('API_BASE_URL', '');

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

    // Step 3: save to server
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
      'image/webp': 'webp', 'video/mp4': 'mp4', 'image/gif': 'gif',
      'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf',
    };
    const ext = extMap[mimeType] ?? 'bin';

    if (!filename) {
      filename = `whatsapp_${Date.now()}_${mediaId}.${ext}`;
    } else if (!path.extname(filename)) {
      filename += `.${ext}`;
    }

    let subdir = 'products';
    if (mimeType.startsWith('video/')) subdir = 'generated';
    else if (!mimeType.startsWith('image/')) subdir = '';

    const saveDir = path.join(uploadsDir, subdir);
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    const savePath = path.join(saveDir, filename);
    fs.writeFileSync(savePath, fileData);

    const publicUrl = `${baseUrl}/uploads/${subdir ? subdir + '/' : ''}${filename}`;

    return { status: 'success', media_id: mediaId, mime_type: mimeType, filename, saved_path: savePath, public_url: publicUrl, file_size: fileData.length };
  }
}
