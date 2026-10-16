import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { BusinessEntity } from './entities/business.entity';
import { UserEntity } from './entities/user.entity';
import { OrganizationEntity } from './entities/organization.entity';
import { OrganizationMemberEntity } from './entities/organization-member.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { CityEntity } from './entities/city.entity';
import { CategoryEntity } from './entities/category.entity';
import { ContactEntity } from './entities/contact.entity';
import { WebsiteEntity } from './entities/website.entity';
import { LeadScoreEntity } from './entities/lead-score.entity';
import { SearchJobEntity } from './entities/search-job.entity';
import { SourceEntity } from './entities/source.entity';
import { BusinessSourceEntity } from './entities/business-source.entity';
import { BusinessFeatureEntity } from './entities/business-feature.entity';
import { SubscriptionPlanEntity } from './entities/subscription-plan.entity';
import { SubscriptionEntity } from './entities/subscription.entity';
import { PaymentEntity } from './entities/payment.entity';
import { OrganizationUsageEntity } from './entities/usage.entity';
import { CrawlJobEntity } from './entities/crawl-job.entity';
import { CrawlJobUrlEntity } from './entities/crawl-job-url.entity';
import { CrawlResultEntity } from './entities/crawl-result.entity';
import { WebsiteAnalysisEntity } from './entities/website-analysis.entity';
import { LeadEntity } from './entities/lead.entity';
import { EnrichmentJobEntity } from './entities/enrichment-job.entity';
import { AiInsightEntity } from './entities/ai-insight.entity';
import { ConversationThreadEntity } from './entities/conversation-thread.entity';
import { CommunicationMessageEntity } from './entities/communication-message.entity';
import { AiReplySuggestionEntity } from './entities/ai-reply-suggestion.entity';
import { SalesSequenceEntity } from './entities/sales-sequence.entity';
import { SequenceEnrollmentEntity } from './entities/sequence-enrollment.entity';
import { OutreachMessageEntity } from './entities/outreach-message.entity';
import { OutreachTemplateEntity } from './entities/outreach-template.entity';
import { AiSalesDecisionEntity } from './entities/ai-sales-decision.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    UserEntity, OrganizationEntity, OrganizationMemberEntity, RefreshTokenEntity,
    BusinessEntity, CityEntity, CategoryEntity, ContactEntity, WebsiteEntity,
    LeadScoreEntity, SearchJobEntity, SourceEntity, BusinessSourceEntity,
    BusinessFeatureEntity, SubscriptionPlanEntity, SubscriptionEntity, PaymentEntity, OrganizationUsageEntity, CrawlJobEntity, CrawlJobUrlEntity, CrawlResultEntity, WebsiteAnalysisEntity, LeadEntity, EnrichmentJobEntity, AiInsightEntity, ConversationThreadEntity, CommunicationMessageEntity, AiReplySuggestionEntity, OutreachMessageEntity, OutreachTemplateEntity, SalesSequenceEntity, SequenceEnrollmentEntity, AiSalesDecisionEntity,
  ],
  migrations: ['src/database/migrations/*.ts'],
});
