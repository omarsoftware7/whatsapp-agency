import { CreativeJob } from './creative-job.entity';
export declare class WebMultiProduct {
    id: number;
    job_id: number;
    job: CreativeJob;
    sort_order: number;
    product_image_url: string;
    product_name: string;
    price: string;
    old_price: string;
    notes: string;
    generated_image_url: string;
    status: string;
    error_message: string;
    created_at: Date;
    updated_at: Date;
}
