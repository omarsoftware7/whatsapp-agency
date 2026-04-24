import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Res } from '@nestjs/common';
import { SessionGuard } from '../../common/guards/session.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser, SessionUser } from '../../common/decorators/current-user.decorator';
import { BusinessCardsService } from './business-cards.service';

@Controller('business-cards')
export class BusinessCardsController {
  constructor(private readonly service: BusinessCardsService) {}

  @Get('public/:slug')
  async renderPublic(@Param('slug') slug: string, @Res() res: any) {
    const card = await this.service.getBySlug(slug);
    // In production, render a proper HTML template here
    res.json(card);
  }

  @Get(':clientId')
  @UseGuards(SessionGuard)
  get(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.service.getForClient(clientId);
  }

  @Post(':clientId')
  @UseGuards(SessionGuard)
  save(@Param('clientId', ParseIntPipe) clientId: number, @Body() body: any) {
    return this.service.save(clientId, body);
  }

  @Get('admin/all')
  @UseGuards(SessionGuard, AdminGuard)
  listAll() {
    return this.service.listAll();
  }
}
