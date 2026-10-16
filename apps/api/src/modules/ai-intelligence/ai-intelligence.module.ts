import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiIntelligenceController } from './ai-intelligence.controller';
import { AiIntelligenceService } from './ai-intelligence.service';
import { AiInsightEntity } from '../../database/entities/ai-insight.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { LeadScoreEntity } from '../../database/entities/lead-score.entity';
import { BusinessFeatureEntity } from '../../database/entities/business-feature.entity';
import { ContactEntity } from '../../database/entities/contact.entity';
import { OutreachMessageEntity } from '../../database/entities/outreach-message.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [TypeOrmModule.forFeature([AiInsightEntity, BusinessEntity, LeadEntity, LeadScoreEntity, BusinessFeatureEntity, ContactEntity, OutreachMessageEntity]), OrganizationsModule, AuthorizationModule],
  controllers: [AiIntelligenceController],
  providers: [AiIntelligenceService],
  exports: [AiIntelligenceService],
})
export class AiIntelligenceModule {}
