import { AdminService } from './admin.service';
export declare class AdminLandingPagesController {
    private readonly admin;
    constructor(admin: AdminService);
    list(page: string): Promise<{
        items: never[];
        total: number;
        page: number;
        limit: number;
    }>;
}
