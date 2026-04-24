import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebLandingPageLead } from '../../entities/web-landing-page-lead.entity';
import { WebManualLead } from '../../entities/web-manual-lead.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(WebLandingPageLead) private leadRepo: Repository<WebLandingPageLead>,
    @InjectRepository(WebManualLead) private manualLeadRepo: Repository<WebManualLead>,
  ) {}

  async listForClient(clientId: number) {
    return this.leadRepo.find({ where: { client_id: clientId }, order: { created_at: 'DESC' } });
  }

  async listManualForClient(clientId: number, userId: number) {
    return this.manualLeadRepo.find({ where: { client_id: clientId, web_user_id: userId }, order: { imported_at: 'DESC' } });
  }

  async importCsv(clientId: number, userId: number, rows: { name?: string; email?: string; phone?: string; source?: string }[]) {
    const toSave = rows.slice(0, 500).map((r) =>
      this.manualLeadRepo.create({ client_id: clientId, web_user_id: userId, ...r }),
    );
    await this.manualLeadRepo.save(toSave);
    return { imported: toSave.length };
  }
}
