import { AdminService } from './admin.service';
export declare class AdminMetricsController {
    private readonly admin;
    constructor(admin: AdminService);
    metrics(period: string): Promise<{
        active_users: number;
        trial_users: number;
        total_users: number;
        mrr: number;
        arr: number;
        arpu: number;
        total_jobs: number;
        published_jobs: number;
        publishing_rate: string;
        total_referrals: number;
        period_days: number;
    }>;
}
