import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { BrandsModule } from './modules/brands/brands.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ContentPlansModule } from './modules/content-plans/content-plans.module';
import { LandingPagesModule } from './modules/landing-pages/landing-pages.module';
import { BusinessCardsModule } from './modules/business-cards/business-cards.module';
import { ScheduledPostsModule } from './modules/scheduled-posts/scheduled-posts.module';
import { LibraryModule } from './modules/library/library.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ProfileModule } from './modules/profile/profile.module';
import { LeadsModule } from './modules/leads/leads.module';
import { UploadModule } from './modules/upload/upload.module';
import { ToolsModule } from './modules/tools/tools.module';
import { AiModule } from './modules/ai/ai.module';
import { MetaModule } from './modules/meta/meta.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        ssl:
          config.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    BrandsModule,
    JobsModule,
    ContentPlansModule,
    LandingPagesModule,
    BusinessCardsModule,
    ScheduledPostsModule,
    LibraryModule,
    PaymentsModule,
    AdminModule,
    WebhooksModule,
    ProfileModule,
    LeadsModule,
    UploadModule,
    ToolsModule,
    AiModule,
    MetaModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
