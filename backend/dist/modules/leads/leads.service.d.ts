import { Repository } from 'typeorm';
import { WebLandingPageLead } from '../../entities/web-landing-page-lead.entity';
import { WebManualLead } from '../../entities/web-manual-lead.entity';
export declare class LeadsService {
    private leadRepo;
    private manualLeadRepo;
    constructor(leadRepo: Repository<WebLandingPageLead>, manualLeadRepo: Repository<WebManualLead>);
    listForClient(clientId: number): Promise<WebLandingPageLead[]>;
    listManualForClient(clientId: number, userId: number): Promise<WebManualLead[]>;
    importCsv(clientId: number, userId: number, rows: {
        name?: string;
        email?: string;
        phone?: string;
        source?: string;
    }[]): Promise<{
        imported: number;
    }>;
}
