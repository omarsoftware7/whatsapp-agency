import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin/metrics')
@UseGuards(SessionGuard, AdminGuard)
export class AdminMetricsController {
  constructor(private readonly admin: AdminService) {}
  @Get() metrics(@Query('period') period: string) { return this.admin.getMetrics(parseInt(period || '30')); }
}
