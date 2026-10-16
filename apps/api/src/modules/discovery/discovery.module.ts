import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryController } from './discovery.controller';
import { SearchJobEntity } from '../../database/entities/search-job.entity';
import { CrawlJobEntity } from '../../database/entities/crawl-job.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { CityEntity } from '../../database/entities/city.entity';
import { CategoryEntity } from '../../database/entities/category.entity';
import { DiscoveryOptionsController } from './discovery-options.controller';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrganizationsModule } from '../organizations/organizations.module';
@Module({ imports: [TypeOrmModule.forFeature([SearchJobEntity, CrawlJobEntity, LeadEntity, BusinessEntity, CityEntity, CategoryEntity]), AuthorizationModule, OrganizationsModule], controllers: [DiscoveryController, DiscoveryOptionsController] })
export class DiscoveryModule {}
