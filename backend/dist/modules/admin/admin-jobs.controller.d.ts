import { AdminService } from './admin.service';
export declare class AdminJobsController {
    private readonly admin;
    constructor(admin: AdminService);
    list(search: string, page: string): Promise<{
        items: import("../../entities/creative-job.entity").CreativeJob[];
        total: number;
        page: number;
        limit: number;
    }>;
}
