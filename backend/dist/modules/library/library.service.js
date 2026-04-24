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
exports.LibraryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const creative_job_entity_1 = require("../../entities/creative-job.entity");
const web_multi_product_entity_1 = require("../../entities/web-multi-product.entity");
let LibraryService = class LibraryService {
    constructor(jobRepo, productRepo) {
        this.jobRepo = jobRepo;
        this.productRepo = productRepo;
    }
    async getLibrary(clientId) {
        const jobs = await this.jobRepo.find({
            where: { client_id: clientId },
            order: { created_at: 'DESC' },
        });
        const images = [];
        const videos = [];
        const copies = [];
        const uploads = [];
        for (const job of jobs) {
            if (job.design_variations?.length) {
                for (const url of job.design_variations) {
                    if (job.media_type === 'video') {
                        videos.push({ url, job_id: job.id, job_type: job.job_type, created_at: job.created_at });
                    }
                    else {
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
                }
                catch { }
            }
        }
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
};
exports.LibraryService = LibraryService;
exports.LibraryService = LibraryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(creative_job_entity_1.CreativeJob)),
    __param(1, (0, typeorm_1.InjectRepository)(web_multi_product_entity_1.WebMultiProduct)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LibraryService);
//# sourceMappingURL=library.service.js.map