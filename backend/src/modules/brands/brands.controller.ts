import {
  Controller, Get, Post, Body, Query, UseGuards, UseInterceptors,
  UploadedFile, Param, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { BrandsService } from './brands.service';

@Controller('brands')
@UseGuards(SessionGuard)
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.brands.listForUser(user.id, user.role);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.brands.getOne(id, user.id, user.role);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.brands.create(body, user.id);
  }

  @Post(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: SessionUser,
  ) {
    return this.brands.updateProfile(id, body, user.id, user.role);
  }

  @Post(':id/delete')
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.brands.delete(id, user.id, user.role);
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (_req, file, cb) => cb(null, `${Date.now()}${extname(file.originalname)}`),
      }),
    }),
  )
  uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: SessionUser,
  ) {
    // TODO: extract dominant colors via sharp and update client record
    return { success: true, filename: file.filename };
  }
}
