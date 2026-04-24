import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToolsService } from './tools.service';
import { HtmlToImageController } from './html-to-image.controller';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebMultiProduct } from '../../entities/web-multi-product.entity';
import { WebDesignEditRequest } from '../../entities/web-design-edit-request.entity';
import { WebLandingPage } from '../../entities/web-landing-page.entity';
import { WebUser } from '../../entities/web-user.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';
import { Client } from '../../entities/client.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreativeJob, WebMultiProduct, WebDesignEditRequest, WebLandingPage, WebUser, WebUserClient, Client]),
    AiModule,
  ],
  controllers: [HtmlToImageController],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
