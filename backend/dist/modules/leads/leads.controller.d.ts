import { SessionUser } from '../../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
export declare class LeadsController {
    private readonly service;
    constructor(service: LeadsService);
    list(clientId: number): Promise<import("../../entities/web-landing-page-lead.entity").WebLandingPageLead[]>;
    listManual(clientId: number, user: SessionUser): Promise<import("../../entities/web-manual-lead.entity").WebManualLead[]>;
    importCsv(file: Express.Multer.File, body: {
        client_id: string;
    }, user: SessionUser): Promise<{
        imported: number;
    }>;
}
