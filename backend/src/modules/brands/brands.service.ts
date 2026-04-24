import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../entities/client.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
import { GeminiService } from '../ai/gemini.service';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(WebUserClient) private wucRepo: Repository<WebUserClient>,
    @InjectRepository(WebBrandProfile) private profileRepo: Repository<WebBrandProfile>,
    private readonly gemini: GeminiService,
  ) {}

  async listForUser(userId: number, role: string) {
    if (role === 'admin') {
      return this.clientRepo.find({ relations: ['brandProfile'], order: { created_at: 'DESC' } });
    }
    const links = await this.wucRepo.find({ where: { web_user_id: userId }, relations: ['client', 'client.brandProfile'] });
    return links.map((l) => l.client);
  }

  async getOne(clientId: number, userId: number, role: string) {
    const client = await this.clientRepo.findOne({ where: { id: clientId }, relations: ['brandProfile'] });
    if (!client) throw new NotFoundException('Brand not found');
    if (role !== 'admin') await this.ensureOwner(clientId, userId);
    return client;
  }

  async create(dto: any, userId: number) {
    const phone_number = `web${Date.now().toString(36)}`;
    const client = this.clientRepo.create({
      phone_number,
      business_name: dto.business_name,
      business_description: dto.description,
      default_language: dto.language || 'en',
      industry: dto.category,
      business_phone: dto.business_phone,
      business_address: dto.location,
    });
    await this.clientRepo.save(client);

    await this.wucRepo.save(this.wucRepo.create({ web_user_id: userId, client_id: client.id }));

    const profile = this.profileRepo.create({
      client_id: client.id,
      category: dto.category,
      website: dto.website,
      instagram_handle: dto.instagram_handle,
      target_audience: dto.target_audience,
      price_range: dto.price_range,
      country: dto.country || 'Israel',
      facebook_page_url: dto.facebook_page_url,
      instagram_page_url: dto.instagram_page_url,
      heard_about: dto.heard_about,
    });
    await this.profileRepo.save(profile);

    await this.inferBrandProfile(client, profile);
    return client;
  }

  async updateProfile(clientId: number, dto: any, userId: number, role: string) {
    const client = await this.getOne(clientId, userId, role);
    Object.assign(client, {
      business_name: dto.business_name ?? client.business_name,
      business_description: dto.description ?? client.business_description,
      industry: dto.category ?? client.industry,
    });
    await this.clientRepo.save(client);

    let profile = await this.profileRepo.findOne({ where: { client_id: clientId } });
    if (!profile) {
      profile = this.profileRepo.create({ client_id: clientId });
    }
    Object.assign(profile, {
      category: dto.category ?? profile.category,
      website: dto.website ?? profile.website,
      target_audience: dto.target_audience ?? profile.target_audience,
      price_range: dto.price_range ?? profile.price_range,
      country: dto.country ?? profile.country,
    });
    await this.profileRepo.save(profile);
    await this.inferBrandProfile(client, profile);
    return client;
  }

  async updateLogoUrl(clientId: number, url: string, userId: number, role: string) {
    if (role !== 'admin') await this.ensureOwner(clientId, userId);
    await this.clientRepo.update(clientId, { logo_filename: url });
    return { success: true };
  }

  async delete(clientId: number, userId: number, role: string) {
    if (role !== 'admin') await this.ensureOwner(clientId, userId);
    await this.clientRepo.delete(clientId);
  }

  async ensureOwner(clientId: number, userId: number) {
    const link = await this.wucRepo.findOne({ where: { client_id: clientId, web_user_id: userId } });
    if (!link) throw new ForbiddenException('Not your brand');
  }

  private async inferBrandProfile(client: Client, profile: WebBrandProfile) {
    try {
      const prompt = `Given this business:\nName: ${client.business_name}\nDescription: ${client.business_description}\nCategory: ${profile.category}\nCountry: ${profile.country}\n\nSuggest: brand_tone (professional/playful/luxury/minimal/vibrant), font_preference, and a short target_audience description. Reply as JSON only.`;
      const result = await this.gemini.generateText(prompt);
      const json = JSON.parse(result.replace(/```json|```/g, '').trim());
      if (json.brand_tone) client.brand_tone = json.brand_tone;
      if (json.font_preference) client.font_preference = json.font_preference;
      if (json.target_audience) profile.target_audience = json.target_audience;
      await this.clientRepo.save(client);
      await this.profileRepo.save(profile);
    } catch {}
  }
}
