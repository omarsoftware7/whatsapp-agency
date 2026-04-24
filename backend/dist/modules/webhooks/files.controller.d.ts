import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
export declare class FilesController {
    private readonly config;
    constructor(config: ConfigService);
    serveFile(filePath: string, res: Response): void;
}
