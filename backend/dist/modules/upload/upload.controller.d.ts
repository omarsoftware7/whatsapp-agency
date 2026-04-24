export declare class UploadController {
    uploadProducts(files: Express.Multer.File[]): {
        success: boolean;
        urls: string[];
    };
}
