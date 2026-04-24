import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common';
import { LandingPagesService } from './landing-pages.service';

@Controller('public')
export class PublicLandingController {
  constructor(private readonly service: LandingPagesService) {}

  @Get('landing/:slug')
  async render(@Param('slug') slug: string, @Res() res: any) {
    const page = await this.service.getBySlug(slug);
    res.setHeader('Content-Type', 'text/html');
    res.send(page.html);
  }

  @Post('leads')
  submitLead(@Body() body: { landing_page_id: number; client_id: number; name?: string; email?: string; phone?: string; source_url?: string }) {
    return this.service.submitLead(body.landing_page_id, body.client_id, body);
  }
}
