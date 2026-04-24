import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { KieService } from './kie.service';

@Module({
  providers: [GeminiService, KieService],
  exports: [GeminiService, KieService],
})
export class AiModule {}
