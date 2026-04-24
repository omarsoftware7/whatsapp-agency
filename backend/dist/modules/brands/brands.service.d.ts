import { Repository } from 'typeorm';
import { Client } from '../../entities/client.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
import { GeminiService } from '../ai/gemini.service';
export declare class BrandsService {
    private clientRepo;
    private wucRepo;
    private profileRepo;
    private readonly gemini;
    constructor(clientRepo: Repository<Client>, wucRepo: Repository<WebUserClient>, profileRepo: Repository<WebBrandProfile>, gemini: GeminiService);
    listForUser(userId: number, role: string): Promise<Client[]>;
    getOne(clientId: number, userId: number, role: string): Promise<Client>;
    create(dto: any, userId: number): Promise<Client>;
    updateProfile(clientId: number, dto: any, userId: number, role: string): Promise<Client>;
    delete(clientId: number, userId: number, role: string): Promise<void>;
    ensureOwner(clientId: number, userId: number): Promise<void>;
    private inferBrandProfile;
}
