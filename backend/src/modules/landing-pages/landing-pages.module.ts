import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingPagesController } from './landing-pages.controller';
import { PublicLandingController } from './public-landing.controller';
import { LandingPagesService } from './landing-pages.service';
import { WebLandingPage } from '../../entities/web-landing-page.entity';
import { WebLandingPageLead } from '../../entities/web-landing-page-lead.entity';
import { WebLandingPageEdit } from '../../entities/web-landing-page-edit.entity';
import { WebDeletedLandingPage } from '../../entities/web-deleted-landing-page.entity';
import { WebUser } from '../../entities/web-user.entity';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [TypeOrmModule.forFeature([WebLandingPage, WebLandingPageLead, WebLandingPageEdit, WebDeletedLandingPage, WebUser]), ToolsModule],
  controllers: [LandingPagesController, PublicLandingController],
  providers: [LandingPagesService],
  exports: [LandingPagesService],
})
export class LandingPagesModule {}
