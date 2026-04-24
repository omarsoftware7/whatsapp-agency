import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { LandingPagesService } from './landing-pages.service';

@Controller('landing-pages')
@UseGuards(SessionGuard)
export class LandingPagesController {
  constructor(private readonly service: LandingPagesService) {}

  @Get()
  list(@Query('client_id', ParseIntPipe) clientId: number, @CurrentUser() user: SessionUser) {
    return this.service.list(clientId, user.id);
  }

  @Post()
  create(@Body() body: { client_id: number; user_prompt: string; user_images?: string[] }, @CurrentUser() user: SessionUser) {
    return this.service.create(body.client_id, user.id, body.user_prompt, body.user_images);
  }

  @Post(':id/delete')
  softDelete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SessionUser) {
    return this.service.softDelete(id, user.id);
  }
}
