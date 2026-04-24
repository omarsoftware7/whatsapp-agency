import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin/brands')
@UseGuards(SessionGuard, AdminGuard)
export class AdminBrandsController {
  constructor(private readonly admin: AdminService) {}
  @Get() list() { return this.admin.listBrands(); }
}
