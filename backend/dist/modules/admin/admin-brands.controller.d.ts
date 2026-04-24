import { AdminService } from './admin.service';
export declare class AdminBrandsController {
    private readonly admin;
    constructor(admin: AdminService);
    list(): Promise<import("../../entities/client.entity").Client[]>;
}
