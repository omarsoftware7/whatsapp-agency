import { LibraryService } from './library.service';
export declare class LibraryController {
    private readonly service;
    constructor(service: LibraryService);
    getLibrary(clientId: number): Promise<{
        images: any[];
        videos: any[];
        copies: any[];
        uploads: any[];
    }>;
}
