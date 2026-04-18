import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(SessionGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@Query('client_id', ParseIntPipe) clientId: number, @CurrentUser() user: SessionUser) {
    return this.jobs.list(clientId, user.id);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: SessionUser) {
    return this.jobs.create(body, user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.jobs.cancel(id, user.id);
  }

  @Post(':id/reset')
  reset(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.jobs.reset(id, user.id);
  }

  @Post(':id/retry-video')
  retryVideo(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.jobs.retryVideo(id, user.id);
  }

  @Post(':id/delete')
  softDelete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.jobs.softDelete(id, user.id);
  }

  @Post(':id/edit-design')
  submitEdit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { user_edit: string; image_url: string; edit_mode: string },
    @CurrentUser() user: SessionUser,
  ) {
    return this.jobs.submitEditRequest(id, user.id, body.user_edit, body.image_url, body.edit_mode);
  }

  @Get(':id/edit-history')
  editHistory(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.jobs.getEditHistory(id, user.id);
  }
}
