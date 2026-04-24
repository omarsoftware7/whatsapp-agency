import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebMultiProduct } from '../../entities/web-multi-product.entity';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(CreativeJob) private jobRepo: Repository<CreativeJob>,
    @InjectRepository(WebMultiProduct) private productRepo: Repository<WebMultiProduct>,
  ) {}

  async getLibrary(clientId: number) {
    const jobs = await this.jobRepo.find({
      where: { client_id: clientId },
      order: { created_at: 'DESC' },
    });

    const images: any[] = [];
    const videos: any[] = [];
    const copies: any[] = [];
    const uploads: any[] = [];

    for (const job of jobs) {
      if (job.design_variations?.length) {
        for (const url of job.design_variations) {
          if (job.media_type === 'video') {
            videos.push({ url, job_id: job.id, job_type: job.job_type, created_at: job.created_at });
          } else {
            images.push({ url, job_id: job.id, job_type: job.job_type, created_at: job.created_at });
          }
        }
      }
      if (job.user_images?.length) {
        for (const url of job.user_images) {
          uploads.push({ url, job_id: job.id, created_at: job.created_at });
        }
      }
      if (job.ad_copy) {
        try {
          copies.push({ ...JSON.parse(job.ad_copy), job_id: job.id, created_at: job.created_at });
        } catch {}
      }
    }

    // Include multi-product generated images
    const products = await this.productRepo.find({
      where: { status: 'completed' },
      relations: ['job'],
    });
    for (const p of products) {
      if (p.job?.client_id === clientId && p.generated_image_url) {
        images.push({ url: p.generated_image_url, job_id: p.job_id, job_type: 'multi_mode', created_at: p.created_at });
      }
    }

    return { images, videos, copies, uploads };
  }
}
