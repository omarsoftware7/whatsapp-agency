import { Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { SessionGuard } from '../../common/guards/session.guard';
import { R2Service } from '../../common/services/r2.service';

@Controller('upload')
@UseGuards(SessionGuard)
export class UploadController {
  constructor(private readonly r2: R2Service) {}

  @Post('products')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadProducts(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await Promise.all(
      files.map((f) => {
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(f.originalname)}`;
        const key = this.r2.buildKey('products', filename);
        return this.r2.upload(key, f.buffer, f.mimetype);
      }),
    );
    return { success: true, urls };
  }
}
