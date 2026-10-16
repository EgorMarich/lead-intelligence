import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchJobsController } from './search-jobs.controller';
import { SearchJobEntity } from '../../database/entities/search-job.entity';
import { RawLeadEntity } from '../../database/entities/raw-lead.entity';
import { BillingModule } from '../billing/billing.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [TypeOrmModule.forFeature([SearchJobEntity, RawLeadEntity]), BillingModule, OrganizationsModule, AuthorizationModule],
  controllers: [SearchJobsController],
})
export class SearchModule {}
