import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { Repository } from 'typeorm';
import { SearchJobEntity } from '../../database/entities/search-job.entity';
import { RawLeadEntity } from '../../database/entities/raw-lead.entity';
import { JobStatus } from '@lead/domain';
import { QUEUES } from '@lead/shared';
import { CreateSearchJobDto } from './search-jobs.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { BillingService } from '../billing/billing.service';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';

@Controller('search-jobs')
@UseGuards(JwtAuthGuard)
export class SearchJobsController {
  private readonly queue: Queue;
  constructor(
    @InjectRepository(SearchJobEntity) private readonly jobs: Repository<SearchJobEntity>,
    @InjectRepository(RawLeadEntity) private readonly rawLeads: Repository<RawLeadEntity>,
    private readonly billing: BillingService,
    private readonly orgs: CurrentOrganizationService,
    private readonly authorization: AuthorizationService,
  ) {
    const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
    this.queue = new Queue(QUEUES.SEARCH, { connection });
  }

  @Post()
  async create(@Body() dto: CreateSearchJobDto, @Req() req: any) {
    const organizationId = (await this.billing.consumeSearch(req.user.sub, req.headers['x-organization-id'])).organizationId;
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.SEARCH_RUN);
    const job = this.jobs.create({ organizationId, source: dto.source ?? 'mock', query: dto.query, cityId: dto.cityId, categoryId: dto.categoryId, filters: dto.filters ?? {}, limit: dto.limit ?? 100, status: JobStatus.PENDING });
    const saved = await this.jobs.save(job);
    await this.queue.add('search', { organizationId, searchJobId: saved.id }, { attempts: Number(process.env.MAX_RETRIES ?? 3), backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 });
    return { data: saved };
  }

  @Get()
  async list(@Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.SEARCH_READ);
    return { data: await this.jobs.find({ where: { organizationId }, order: { createdAt: 'DESC' }, take: 100 }) };
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.SEARCH_READ);
    return { data: await this.jobs.findOneBy({ id, organizationId }) };
  }

  @Get(':id/leads')
  async leads(@Param('id') id: string, @Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.SEARCH_READ);
    const job = await this.jobs.findOneBy({ id, organizationId });
    if (!job) return { data: [] };
    return { data: await this.rawLeads.find({ where: { organizationId, searchJobId: id }, order: { createdAt: 'DESC' }, take: 1000 }) };
  }
}
