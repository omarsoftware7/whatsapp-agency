import { Controller, Post, Body, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('jobs')
@UseGuards(ApiKeyGuard)
export class JobsController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Post()
  async handle(@Body() body: any) {
    const action: string = body.action;
    const jobId: number = parseInt(body.job_id);

    if (!action) throw new BadRequestException('action required');
    if (!jobId) throw new BadRequestException('job_id required');

    switch (action) {
      case 'get_job': {
        const result = await this.whatsapp.getJob(jobId);
        if (!result) throw new NotFoundException('Job not found');
        return result;
      }

      case 'set_lock':
        return this.whatsapp.setLock(jobId);

      case 'release_lock':
        return this.whatsapp.releaseLock(jobId);

      case 'save_input': {
        const userMessage: string = body.user_message ?? null;
        const userImages: string[] | null = body.user_images ?? null;
        return this.whatsapp.saveInput(jobId, userMessage, userImages);
      }

      case 'save_design': {
        const designVariations: string[] = body.design_variations;
        if (!designVariations || !Array.isArray(designVariations)) throw new BadRequestException('design_variations array required');
        const designPrompt: string = body.design_prompt ?? null;
        const mediaType: string = body.media_type ?? 'image';
        return this.whatsapp.saveDesign(jobId, designVariations, designPrompt, mediaType);
      }

      case 'approve_design': {
        const approvedIndex: number = parseInt(body.approved_index ?? '0');
        const result = await this.whatsapp.approveDesign(jobId, approvedIndex);
        if (!result) throw new NotFoundException('Job not found');
        return result;
      }

      case 'reject_design': {
        const result = await this.whatsapp.rejectDesign(jobId);
        if (!result) throw new NotFoundException('Job not found');
        return result;
      }

      case 'save_copy': {
        const adCopy = body.ad_copy;
        if (!adCopy) throw new BadRequestException('ad_copy required');
        return this.whatsapp.saveCopy(jobId, adCopy);
      }

      case 'approve_copy': {
        const result = await this.whatsapp.approveCopy(jobId);
        return result;
      }

      case 'reject_copy': {
        const result = await this.whatsapp.rejectCopy(jobId);
        if (!result) throw new NotFoundException('Job not found');
        return result;
      }

      case 'undo_design_approval': {
        const result = await this.whatsapp.undoDesignApproval(jobId);
        if (!result) throw new NotFoundException('Job not found');
        return result;
      }

      case 'undo_copy_approval': {
        const result = await this.whatsapp.undoCopyApproval(jobId);
        if (!result) throw new NotFoundException('Job not found');
        return result;
      }

      case 'approve_publish':
        return this.whatsapp.approvePublish(jobId);

      case 'add_multi_product': {
        const productData = body.product_data;
        if (!productData) throw new BadRequestException('product_data required');
        return this.whatsapp.addMultiProduct(jobId, productData);
      }

      case 'update_last_product': {
        const productData = body.product_data;
        if (!productData) throw new BadRequestException('product_data required');
        return this.whatsapp.updateLastProduct(jobId, productData);
      }

      case 'save_multi_variants': {
        const variants: string[] = body.design_variations;
        if (!variants || !Array.isArray(variants)) throw new BadRequestException('design_variations array required');
        return this.whatsapp.saveMultiVariants(jobId, variants);
      }

      case 'save_bulk_products': {
        const products: any[] = body.products;
        if (!products || !Array.isArray(products)) throw new BadRequestException('products array required');
        return this.whatsapp.saveBulkProducts(jobId, products);
      }

      case 'approve_template':
        return this.whatsapp.approveTemplate(jobId);

      case 'save_reel': {
        const reelUrl: string = body.reel_url;
        if (!reelUrl) throw new BadRequestException('reel_url required');
        return this.whatsapp.saveReel(jobId, reelUrl, body.duration_seconds ?? null);
      }

      default:
        throw new BadRequestException(`Invalid action: ${action}`);
    }
  }
}
