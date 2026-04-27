import { Controller, Get, Post, Body, Query, Res, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrchestratorService } from './agent/orchestrator.service';

// Meta webhook verification + incoming WhatsApp messages
@Controller('webhook')
export class WhatsappController {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  verify(@Query() query: any, @Res() res: any) {
    const verifyToken = this.config.get('META_VERIFY_TOKEN');
    const incoming = query['hub.verify_token'] ?? '';
    if (query['hub.mode'] === 'subscribe' && incoming === verifyToken) {
      return res.send(query['hub.challenge']);
    }
    return res.status(403).send('Verification failed');
  }

  @Post()
  @HttpCode(200)
  incoming(@Body() body: any) {
    // Fire-and-forget: Meta requires a 200 within 20s
    this.orchestrator.handle(body).catch(() => {});
    return { status: 'ok' };
  }
}
