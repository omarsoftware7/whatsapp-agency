import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin/landing-pages')
@UseGuards(SessionGuard, AdminGuard)
export class AdminLandingPagesController {
  constructor(private readonly admin: AdminService) {}
  @Get() list(@Query('page') page: string) { return this.admin.listLandingPages(parseInt(page || '1')); }
}
