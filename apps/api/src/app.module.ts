import { CrawlModule } from "./modules/crawl/crawl.module";
import { LeadsModule } from './modules/leads/leads.module';
import { LeadScoringModule } from './modules/lead-scoring/lead-scoring.module';
import { CrawlJobsModule } from './modules/crawl-jobs/crawl-jobs.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { BillingModule } from './modules/billing/billing.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BusinessEntity } from './database/entities/business.entity';
import { CityEntity } from './database/entities/city.entity';
import { CategoryEntity } from './database/entities/category.entity';
import { ContactEntity } from './database/entities/contact.entity';
import { WebsiteEntity } from './database/entities/website.entity';
import { LeadScoreEntity } from './database/entities/lead-score.entity';
import { SearchJobEntity } from './database/entities/search-job.entity';
import { SourceEntity } from './database/entities/source.entity';
import { BusinessSourceEntity } from './database/entities/business-source.entity';
import { BusinessFeatureEntity } from './database/entities/business-feature.entity';
import { HealthController } from './modules/health/health.controller';
import { BusinessesController } from './modules/businesses/businesses.controller';
import { SearchModule } from './modules/search/search.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { RawLeadEntity } from './database/entities/raw-lead.entity';
import { LeadIntelligenceModule } from './modules/lead-intelligence/lead-intelligence.module';
import { WebsiteIntelligenceModule } from './modules/website-intelligence/website-intelligence.module';
import { CrawlJobEntity } from './database/entities/crawl-job.entity';
import { CrawlJobUrlEntity } from './database/entities/crawl-job-url.entity';
import { CrawlResultEntity } from './database/entities/crawl-result.entity';
import { WebsiteAnalysisEntity } from './database/entities/website-analysis.entity';
import { LeadEntity } from './database/entities/lead.entity';
import { EnrichmentJobEntity } from './database/entities/enrichment-job.entity';
import { EnrichmentModule } from './modules/enrichment/enrichment.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { OutreachMessageEntity } from './database/entities/outreach-message.entity';
import { OutreachTemplateEntity } from './database/entities/outreach-template.entity';
import { ConversationThreadEntity } from './database/entities/conversation-thread.entity';
import { CommunicationMessageEntity } from './database/entities/communication-message.entity';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiIntelligenceModule } from './modules/ai-intelligence/ai-intelligence.module';
import { AiInsightEntity } from './database/entities/ai-insight.entity';
import { AiReplySuggestionEntity } from './database/entities/ai-reply-suggestion.entity';
import { SalesSequenceEntity } from './database/entities/sales-sequence.entity';
import { SequenceEnrollmentEntity } from './database/entities/sequence-enrollment.entity';
import { AiSalesDecisionEntity } from './database/entities/ai-sales-decision.entity';
import { SequencesModule } from './modules/sequences/sequences.module';
import { CommandCenterModule } from './modules/command-center/command-center.module';
import { AiSalesManagerModule } from './modules/ai-sales-manager/ai-sales-manager.module';
import { RevenueModule } from './modules/revenue/revenue.module';

@Module({
  imports: [RevenueModule, AiSalesManagerModule, CommandCenterModule, SequencesModule, AiIntelligenceModule, AnalyticsModule, OutreachModule, CommunicationsModule, EnrichmentModule, DiscoveryModule, CrawlModule, LeadsModule, LeadScoringModule, CrawlJobsModule, 
    ScrapingModule,
    ScheduleModule.forRoot(),
    AuthModule,
    OrganizationsModule,
    BillingModule,
    AuthorizationModule,
    SearchModule,
    LeadIntelligenceModule,
    WebsiteIntelligenceModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
    }),
    TypeOrmModule.forFeature([
      BusinessEntity, CityEntity, CategoryEntity, ContactEntity, WebsiteEntity,
      LeadScoreEntity, SearchJobEntity, SourceEntity, BusinessSourceEntity,
      BusinessFeatureEntity, RawLeadEntity, CrawlJobEntity, CrawlJobUrlEntity, CrawlResultEntity, WebsiteAnalysisEntity, LeadEntity, EnrichmentJobEntity, OutreachMessageEntity, OutreachTemplateEntity, AiInsightEntity, ConversationThreadEntity, CommunicationMessageEntity, AiReplySuggestionEntity, SalesSequenceEntity, SequenceEnrollmentEntity, AiSalesDecisionEntity,
    ]),
  ],
  controllers: [HealthController, BusinessesController],
})
export class AppModule {}
