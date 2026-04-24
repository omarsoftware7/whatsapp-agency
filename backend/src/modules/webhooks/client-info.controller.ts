import { Controller, Post, Body, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('get-client-info')
@UseGuards(ApiKeyGuard)
export class ClientInfoController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Post()
  async getInfo(@Body() body: any) {
    const clientId: number = parseInt(body.client_id);
    if (!clientId) throw new BadRequestException('client_id required');
    try {
      return await this.whatsapp.getClientInfo(clientId);
    } catch (e: any) {
      throw new NotFoundException(e.message);
    }
  }
}
