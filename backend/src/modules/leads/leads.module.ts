import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { WebLandingPageLead } from '../../entities/web-landing-page-lead.entity';
import { WebManualLead } from '../../entities/web-manual-lead.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebLandingPageLead, WebManualLead])],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
