import { SessionUser } from '../../common/decorators/current-user.decorator';
import { SumitService } from './sumit.service';
export declare class SumitController {
    private readonly sumit;
    constructor(sumit: SumitService);
    create(body: any, user: SessionUser): Promise<{
        success: boolean;
    }>;
    cancel(user: SessionUser): Promise<{
        success: boolean;
    }>;
}
