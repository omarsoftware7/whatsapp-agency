import { Repository } from 'typeorm';
import { WebBusinessCard } from '../../entities/web-business-card.entity';
export declare class BusinessCardsService {
    private cardRepo;
    constructor(cardRepo: Repository<WebBusinessCard>);
    getForClient(clientId: number): Promise<WebBusinessCard | null>;
    save(clientId: number, dto: Partial<WebBusinessCard>): Promise<WebBusinessCard>;
    getBySlug(slug: string): Promise<WebBusinessCard | null>;
    listAll(): Promise<WebBusinessCard[]>;
}
