import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
export declare class GoogleOAuthController {
    private readonly authService;
    private readonly config;
    constructor(authService: AuthService, config: ConfigService);
    start(req: any, res: any): void;
    callback(query: any, req: any, res: any): Promise<any>;
}
