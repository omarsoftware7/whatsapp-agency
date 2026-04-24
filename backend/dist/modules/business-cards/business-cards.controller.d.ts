import { BusinessCardsService } from './business-cards.service';
export declare class BusinessCardsController {
    private readonly service;
    constructor(service: BusinessCardsService);
    renderPublic(slug: string, res: any): Promise<void>;
    get(clientId: number): Promise<import("../../entities/web-business-card.entity").WebBusinessCard | null>;
    save(clientId: number, body: any): Promise<import("../../entities/web-business-card.entity").WebBusinessCard>;
    listAll(): Promise<import("../../entities/web-business-card.entity").WebBusinessCard[]>;
}
