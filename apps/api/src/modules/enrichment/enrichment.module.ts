import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessEntity } from '../../database/entities/business.entity';
import { WebsiteEntity } from '../../database/entities/website.entity';
import { EnrichmentJobEntity } from '../../database/entities/enrichment-job.entity';
import { EnrichmentController } from './enrichment.controller';
import { EnrichmentService } from './enrichment.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessEntity, WebsiteEntity, EnrichmentJobEntity]), OrganizationsModule, AuthorizationModule],
  controllers: [EnrichmentController],
  providers: [EnrichmentService],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
