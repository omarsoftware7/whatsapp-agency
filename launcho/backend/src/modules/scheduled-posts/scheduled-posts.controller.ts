import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { ScheduledPostsService } from './scheduled-posts.service';

@Controller('scheduled-posts')
@UseGuards(SessionGuard)
export class ScheduledPostsController {
  constructor(private readonly service: ScheduledPostsService) {}

  @Get()
  list(@Body() body: { client_id: number }) {
    return this.service.list(body.client_id);
  }

  @Post('schedule')
  schedule(@Body() body: { job_id: number; client_id: number; scheduled_at: string; publish_type: string }) {
    return this.service.schedule(body.job_id, body.client_id, new Date(body.scheduled_at), body.publish_type);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(id);
  }
}
