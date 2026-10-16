import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessEntity } from '../../database/entities/business.entity';
import { LeadScoreEntity } from '../../database/entities/lead-score.entity';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(LeadScoreEntity) private readonly scores: Repository<LeadScoreEntity>,
    private readonly orgs: CurrentOrganizationService,
  ) {}
  @Get()
  async list(@Req() req: any, @Query('city') city?: string, @Query('categoryId') categoryId?: string, @Query('minScore') minScore?: string, @Query('limit') limit = '50') {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    const qb = this.businesses.createQueryBuilder('b').where('b.organizationId = :organizationId', { organizationId });
    if (city) qb.andWhere('b.city ILIKE :city', { city: `%${city}%` });
    if (categoryId) qb.andWhere('b.categoryId = :categoryId', { categoryId });
    const businesses = await qb.orderBy('b.createdAt', 'DESC').take(Math.min(Number(limit) || 50, 200)).getMany();
    if (!minScore) return { data: businesses, meta: { count: businesses.length } };
    const ids = businesses.map(b => b.id);
    const scores = ids.length ? await this.scores.createQueryBuilder('s').where('s.businessId IN (:...ids)', { ids }).andWhere('s.score >= :minScore', { minScore: Number(minScore) }).getMany() : [];
    const allowed = new Set(scores.map(s => s.businessId));
    return { data: businesses.filter(b => allowed.has(b.id)), meta: { count: allowed.size } };
  }
  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    const business = await this.businesses.findOneBy({ id, organizationId });
    const score = business ? await this.scores.findOne({ where: { businessId: id }, order: { calculatedAt: 'DESC' } }) : null;
    return { data: { business, score } };
  }
}
