import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { SearchJobEntity } from '../../database/entities/search-job.entity';
import { CrawlJobEntity } from '../../database/entities/crawl-job.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(
    @InjectRepository(SearchJobEntity) private readonly searches: Repository<SearchJobEntity>,
    @InjectRepository(CrawlJobEntity) private readonly crawls: Repository<CrawlJobEntity>,
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    private readonly orgs: CurrentOrganizationService,
    private readonly authorization: AuthorizationService,
  ) {}
  @Get('overview')
  async overview(@Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.SEARCH_READ);
    const [searches, crawls, leads, hot, warm, businesses] = await Promise.all([
      this.searches.find({ where: { organizationId }, order: { createdAt: 'DESC' }, take: 8 }),
      this.crawls.find({ where: { organizationId }, order: { createdAt: 'DESC' }, take: 8 }),
      this.leads.count({ where: { organizationId } }),
      this.leads.count({ where: { organizationId, grade: 'HOT' } }),
      this.leads.count({ where: { organizationId, grade: 'WARM' } }),
      this.businesses.count({ where: { organizationId } }),
    ]);
    const totalUrls = crawls.reduce((n, x) => n + x.totalUrls, 0);
    const processedUrls = crawls.reduce((n, x) => n + x.processedUrls, 0);
    return { data: {
      totals: { businesses, leads, hot, warm },
      active: { searches: searches.filter(x => x.status === 'RUNNING' || x.status === 'PENDING').length, crawls: crawls.filter(x => x.status === 'RUNNING' || x.status === 'QUEUED').length },
      crawl: { totalUrls, processedUrls, progress: totalUrls ? Math.round(processedUrls / totalUrls * 100) : 0 },
      recentSearches: searches,
      recentCrawls: crawls.map(x => ({ ...x, progress: x.totalUrls ? Math.round(x.processedUrls / x.totalUrls * 100) : 0 })),
    }};
  }
}
