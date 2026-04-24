import { SessionUser } from '../../common/decorators/current-user.decorator';
import { BrandsService } from './brands.service';
export declare class BrandsController {
    private readonly brands;
    constructor(brands: BrandsService);
    list(user: SessionUser): Promise<import("../../entities/client.entity").Client[]>;
    getOne(id: number, user: SessionUser): Promise<import("../../entities/client.entity").Client>;
    create(body: any, user: SessionUser): Promise<import("../../entities/client.entity").Client>;
    update(id: number, body: any, user: SessionUser): Promise<import("../../entities/client.entity").Client>;
    delete(id: number, user: SessionUser): Promise<void>;
    uploadLogo(id: number, file: Express.Multer.File, user: SessionUser): {
        success: boolean;
        filename: string;
    };
}
