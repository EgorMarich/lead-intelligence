import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { CityEntity } from '../../database/entities/city.entity';
import { CategoryEntity } from '../../database/entities/category.entity';
import { DISCOVERY_FIELDS, DISCOVERY_OPERATORS } from '@lead/shared';

@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryOptionsController {
  constructor(
    @InjectRepository(CityEntity) private readonly cities: Repository<CityEntity>,
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
    private readonly orgs: CurrentOrganizationService,
  ) {}

  @Get('options')
  async options(@Req() req: any) {
    await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    const [cities, categories] = await Promise.all([
      this.cities.find({ where: { isActive: true }, order: { name: 'ASC' } }),
      this.categories.find({ where: { isActive: true }, order: { name: 'ASC' } }),
    ]);
    return { data: { cities, categories, fields: DISCOVERY_FIELDS, operators: DISCOVERY_OPERATORS, grades: ['HOT', 'WARM', 'COLD', 'LOW'] } };
  }
}
