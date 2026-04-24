import { Controller, Get, Post, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { ContentPlansService } from './content-plans.service';

@Controller('content-plans')
@UseGuards(SessionGuard)
export class ContentPlansController {
  constructor(private readonly service: ContentPlansService) {}

  @Get()
  getLatest(@Query('client_id', ParseIntPipe) clientId: number, @CurrentUser() user: SessionUser) {
    return this.service.getLatest(clientId, user.id);
  }

  @Post('generate')
  generate(@Body() body: { client_id: number; mode: string; user_prompt?: string }, @CurrentUser() user: SessionUser) {
    return this.service.generate(body.client_id, user.id, body.mode, body.user_prompt);
  }

  @Post('items/:id/update')
  updateItem(@Body() body: { item_id: number; title: string; idea_text: string }) {
    return this.service.updateItem(body.item_id, body.title, body.idea_text);
  }

  @Post('items/:id/approve')
  approveItem(@Body() body: { item_id: number }) {
    return this.service.approveItem(body.item_id);
  }

  @Post('items/:id/create-job')
  createJob(@Body() body: { item_id: number; image_size: string; language: string }, @CurrentUser() user: SessionUser) {
    return this.service.createJobFromItem(body.item_id, user.id, body.image_size, body.language);
  }
}
