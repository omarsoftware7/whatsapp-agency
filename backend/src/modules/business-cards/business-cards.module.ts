import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessCardsController } from './business-cards.controller';
import { BusinessCardsService } from './business-cards.service';
import { WebBusinessCard } from '../../entities/web-business-card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WebBusinessCard])],
  controllers: [BusinessCardsController],
  providers: [BusinessCardsService],
})
export class BusinessCardsModule {}
