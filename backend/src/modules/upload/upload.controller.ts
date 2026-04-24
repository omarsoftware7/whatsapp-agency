import { Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
        const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return this.r2.uploadAsPng('products', baseName, f.buffer);
      }),
    );
    return { success: true, urls };
  }
}
