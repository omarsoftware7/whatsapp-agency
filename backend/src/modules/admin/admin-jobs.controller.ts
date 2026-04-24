import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin/jobs')
@UseGuards(SessionGuard, AdminGuard)
export class AdminJobsController {
  constructor(private readonly admin: AdminService) {}
  @Get() list(@Query('search') search: string, @Query('page') page: string) {
    return this.admin.listJobs(search, parseInt(page || '1'));
  }
}
