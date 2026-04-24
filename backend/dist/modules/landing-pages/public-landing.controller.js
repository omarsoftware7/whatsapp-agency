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
exports.PublicLandingController = void 0;
const common_1 = require("@nestjs/common");
const landing_pages_service_1 = require("./landing-pages.service");
let PublicLandingController = class PublicLandingController {
    constructor(service) {
        this.service = service;
    }
    async render(slug, res) {
        const page = await this.service.getBySlug(slug);
        res.setHeader('Content-Type', 'text/html');
        res.send(page.html);
    }
    submitLead(body) {
        return this.service.submitLead(body.landing_page_id, body.client_id, body);
    }
};
exports.PublicLandingController = PublicLandingController;
__decorate([
    (0, common_1.Get)('landing/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PublicLandingController.prototype, "render", null);
__decorate([
    (0, common_1.Post)('leads'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicLandingController.prototype, "submitLead", null);
exports.PublicLandingController = PublicLandingController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [landing_pages_service_1.LandingPagesService])
], PublicLandingController);
//# sourceMappingURL=public-landing.controller.js.map