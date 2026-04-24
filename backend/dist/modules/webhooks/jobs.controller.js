"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const api_key_guard_1 = require("../../common/guards/api-key.guard");
const whatsapp_service_1 = require("./whatsapp.service");
let JobsController = class JobsController {
    constructor(whatsapp) {
        this.whatsapp = whatsapp;
    }
    async handle(body) {
        const action = body.action;
        const jobId = parseInt(body.job_id);
        if (!action)
            throw new common_1.BadRequestException('action required');
        if (!jobId)
            throw new common_1.BadRequestException('job_id required');
        switch (action) {
            case 'get_job': {
                const result = await this.whatsapp.getJob(jobId);
                if (!result)
                    throw new common_1.NotFoundException('Job not found');
                return result;
            }
            case 'set_lock':
                return this.whatsapp.setLock(jobId);
            case 'release_lock':
                return this.whatsapp.releaseLock(jobId);
            case 'save_input': {
                const userMessage = body.user_message ?? null;
                const userImages = body.user_images ?? null;
                return this.whatsapp.saveInput(jobId, userMessage, userImages);
            }
            case 'save_design': {
                const designVariations = body.design_variations;
                if (!designVariations || !Array.isArray(designVariations))
                    throw new common_1.BadRequestException('design_variations array required');
                const designPrompt = body.design_prompt ?? null;
                const mediaType = body.media_type ?? 'image';
                return this.whatsapp.saveDesign(jobId, designVariations, designPrompt, mediaType);
            }
            case 'approve_design': {
                const approvedIndex = parseInt(body.approved_index ?? '0');
                const result = await this.whatsapp.approveDesign(jobId, approvedIndex);
                if (!result)
                    throw new common_1.NotFoundException('Job not found');
                return result;
            }
            case 'reject_design': {
                const result = await this.whatsapp.rejectDesign(jobId);
                if (!result)
                    throw new common_1.NotFoundException('Job not found');
                return result;
            }
            case 'save_copy': {
                const adCopy = body.ad_copy;
                if (!adCopy)
                    throw new common_1.BadRequestException('ad_copy required');
                return this.whatsapp.saveCopy(jobId, adCopy);
            }
            case 'approve_copy': {
                const result = await this.whatsapp.approveCopy(jobId);
                return result;
            }
            case 'reject_copy': {
                const result = await this.whatsapp.rejectCopy(jobId);
                if (!result)
                    throw new common_1.NotFoundException('Job not found');
                return result;
            }
            case 'undo_design_approval': {
                const result = await this.whatsapp.undoDesignApproval(jobId);
                if (!result)
                    throw new common_1.NotFoundException('Job not found');
                return result;
            }
            case 'undo_copy_approval': {
                const result = await this.whatsapp.undoCopyApproval(jobId);
                if (!result)
                    throw new common_1.NotFoundException('Job not found');
                return result;
            }
            case 'approve_publish':
                return this.whatsapp.approvePublish(jobId);
            case 'add_multi_product': {
                const productData = body.product_data;
                if (!productData)
                    throw new common_1.BadRequestException('product_data required');
                return this.whatsapp.addMultiProduct(jobId, productData);
            }
            case 'update_last_product': {
                const productData = body.product_data;
                if (!productData)
                    throw new common_1.BadRequestException('product_data required');
                return this.whatsapp.updateLastProduct(jobId, productData);
            }
            case 'save_multi_variants': {
                const variants = body.design_variations;
                if (!variants || !Array.isArray(variants))
                    throw new common_1.BadRequestException('design_variations array required');
                return this.whatsapp.saveMultiVariants(jobId, variants);
            }
            case 'save_bulk_products': {
                const products = body.products;
                if (!products || !Array.isArray(products))
                    throw new common_1.BadRequestException('products array required');
                return this.whatsapp.saveBulkProducts(jobId, products);
            }
            case 'approve_template':
                return this.whatsapp.approveTemplate(jobId);
            case 'save_reel': {
                const reelUrl = body.reel_url;
                if (!reelUrl)
                    throw new common_1.BadRequestException('reel_url required');
                return this.whatsapp.saveReel(jobId, reelUrl, body.duration_seconds ?? null);
            }
            default:
                throw new common_1.BadRequestException(`Invalid action: ${action}`);
        }
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "handle", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('jobs'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map