import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SearchJobEntity } from '../../database/entities/search-job.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { EnrichmentJobEntity } from '../../database/entities/enrichment-job.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { OutreachMessageEntity } from '../../database/entities/outreach-message.entity';
import { BusinessSourceEntity } from '../../database/entities/business-source.entity';
import { SourceEntity } from '../../database/entities/source.entity';
import { CategoryEntity } from '../../database/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    SearchJobEntity, BusinessEntity, EnrichmentJobEntity, LeadEntity,
    OutreachMessageEntity, BusinessSourceEntity, SourceEntity, CategoryEntity,
  ])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
