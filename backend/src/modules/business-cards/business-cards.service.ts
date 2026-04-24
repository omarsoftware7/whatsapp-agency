import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { WebBusinessCard } from '../../entities/web-business-card.entity';

@Injectable()
export class BusinessCardsService {
  constructor(
    @InjectRepository(WebBusinessCard) private cardRepo: Repository<WebBusinessCard>,
  ) {}

  async getForClient(clientId: number) {
    return this.cardRepo.findOne({ where: { client_id: clientId } });
  }

  async save(clientId: number, dto: Partial<WebBusinessCard>) {
    let card = await this.cardRepo.findOne({ where: { client_id: clientId } });
    if (!card) {
      card = this.cardRepo.create({ client_id: clientId, public_slug: randomBytes(8).toString('hex') });
    }
    Object.assign(card, dto);
    return this.cardRepo.save(card);
  }

  async getBySlug(slug: string) {
    return this.cardRepo.findOne({ where: { public_slug: slug }, relations: ['client'] });
  }

  async listAll() {
    return this.cardRepo.find({ relations: ['client'], order: { created_at: 'DESC' } });
  }
}
