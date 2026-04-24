import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentPlansController } from './content-plans.controller';
import { ContentPlansService } from './content-plans.service';
import { WebContentPlan } from '../../entities/web-content-plan.entity';
import { WebContentPlanItem } from '../../entities/web-content-plan-item.entity';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebUser } from '../../entities/web-user.entity';
import { AiModule } from '../ai/ai.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [TypeOrmModule.forFeature([WebContentPlan, WebContentPlanItem, CreativeJob, WebUser]), AiModule, ToolsModule],
  controllers: [ContentPlansController],
  providers: [ContentPlansService],
})
export class ContentPlansModule {}
