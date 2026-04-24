import { Repository } from 'typeorm';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebMultiProduct } from '../../entities/web-multi-product.entity';
export declare class LibraryService {
    private jobRepo;
    private productRepo;
    constructor(jobRepo: Repository<CreativeJob>, productRepo: Repository<WebMultiProduct>);
    getLibrary(clientId: number): Promise<{
        images: any[];
        videos: any[];
        copies: any[];
        uploads: any[];
    }>;
}
