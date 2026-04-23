import { Controller, Post, Body, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';
import { Client } from '../../entities/client.entity';

@Controller('onboarding')
@UseGuards(ApiKeyGuard)
export class OnboardingController {
  constructor(
    private readonly whatsapp: WhatsappService,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
  ) {}

  @Post()
  async handle(@Body() body: any) {
    const clientId: number = parseInt(body.client_id);
    const step: string = body.step;

    if (!clientId) throw new BadRequestException('client_id required');

    const client = await this.clientRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    switch (step) {
      case 'logo_uploaded': {
        const logoUrl: string = body.logo_url;
        const logoFilename: string = body.logo_filename ?? `logo_${clientId}.png`;
        if (!logoUrl) throw new BadRequestException('logo_url required');
        return this.whatsapp.onboardingLogoUploaded(clientId, logoUrl, logoFilename);
      }

      case 'logo_analyzed': {
        const primaryColor: string = body.primary_color;
        const secondaryColor: string = body.secondary_color;
        if (!primaryColor || !secondaryColor) throw new BadRequestException('primary_color and secondary_color required');
        return this.whatsapp.onboardingLogoAnalyzed(clientId, primaryColor, secondaryColor);
      }

      case 'business_described': {
        const description: string = body.business_description;
        if (!description) throw new BadRequestException('business_description required');
        return this.whatsapp.onboardingBusinessDescribed(clientId, description);
      }

      case 'profile_inferred': {
        const profile = body.brand_profile;
        if (!profile) throw new BadRequestException('brand_profile required');
        return this.whatsapp.onboardingProfileInferred(clientId, profile);
      }

      default:
        throw new BadRequestException(`Invalid step: ${step}`);
    }
  }
}
