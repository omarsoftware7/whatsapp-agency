import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebMultiProduct } from '../../entities/web-multi-product.entity';
import { WebDeletedJob } from '../../entities/web-deleted-job.entity';
import { WebDesignEditRequest } from '../../entities/web-design-edit-request.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';
import { WebUser } from '../../entities/web-user.entity';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreativeJob, WebMultiProduct, WebDeletedJob, WebDesignEditRequest, WebUserClient, WebUser]),
    ToolsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
