import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaService } from './meta.service';
import { MetaOAuthController } from './meta-oauth.controller';
import { WebBrandProfile } from '../../entities/web-brand-profile.entity';
import { Client } from '../../entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebBrandProfile, Client])],
  providers: [MetaService],
  controllers: [MetaOAuthController],
  exports: [MetaService],
})
export class MetaModule {}
