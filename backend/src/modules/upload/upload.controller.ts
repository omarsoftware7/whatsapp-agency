import { Controller, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SessionGuard } from '../../common/guards/session.guard';

@Controller('upload')
@UseGuards(SessionGuard)
export class UploadController {
  @Post('products')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './uploads/products',
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname)}`),
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadProducts(@UploadedFiles() files: Express.Multer.File[]) {
    return {
      success: true,
      urls: files.map((f) => `/uploads/products/${f.filename}`),
    };
  }
}
