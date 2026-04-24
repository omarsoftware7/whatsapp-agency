import {
  Controller, Get, Post, Body, UseGuards, UseInterceptors,
  UploadedFile, Param, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { BrandsService } from './brands.service';
import { R2Service } from '../../common/services/r2.service';

@Controller('brands')
@UseGuards(SessionGuard)
export class BrandsController {
  constructor(
    private readonly brands: BrandsService,
    private readonly r2: R2Service,
  ) {}

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
  @UseInterceptors(FileInterceptor('logo', { storage: memoryStorage() }))
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: SessionUser,
  ) {
    const baseName = `${Date.now()}`;
    const url = await this.r2.uploadAsPng('logos', baseName, file.buffer);
    await this.brands.updateLogoUrl(id, url, user.id, user.role);
    return { success: true, url };
  }
}
