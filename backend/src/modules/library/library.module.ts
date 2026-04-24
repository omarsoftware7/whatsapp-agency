import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { CreativeJob } from '../../entities/creative-job.entity';
import { WebMultiProduct } from '../../entities/web-multi-product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CreativeJob, WebMultiProduct])],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
