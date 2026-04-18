import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { Client } from '../../entities/client.entity';
import { WebUserClient } from '../../entities/web-user-client.entity';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
import { WebLogoOption } from '../../entities/web-logo-option.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Client, WebUserClient, WebBrandProfile, WebLogoOption]), AiModule],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
