import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessEntity } from '../../database/entities/business.entity';
import { LeadScoreEntity } from '../../database/entities/lead-score.entity';
import { BusinessFeatureEntity } from '../../database/entities/business-feature.entity';
import { ContactEntity } from '../../database/entities/contact.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { LeadIntelligenceController } from './lead-intelligence.controller';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessEntity, LeadScoreEntity, BusinessFeatureEntity, ContactEntity, LeadEntity]), OrganizationsModule, AuthorizationModule],
  controllers: [LeadIntelligenceController],
})
export class LeadIntelligenceModule {}
