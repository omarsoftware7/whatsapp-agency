import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf',
};

@Controller('files')
export class FilesController {
  constructor(private readonly config: ConfigService) {}

  @Get('*')
  serveFile(@Param('0') filePath: string, @Res() res: Response) {
    const uploadsDir = this.config.get('UPLOADS_DIR', './uploads');
    // Sanitize path to prevent directory traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
    const fullPath = path.join(uploadsDir, safePath);

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      throw new NotFoundException('File not found');
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(fullPath).pipe(res);
  }
}
