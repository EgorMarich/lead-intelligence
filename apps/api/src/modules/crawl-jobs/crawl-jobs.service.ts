import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { CrawlQueuePayload } from '@lead/shared';
import { CrawlRedisStore, CrawlState } from './crawl-redis.store';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrawlJobEntity } from '../../database/entities/crawl-job.entity';
import { CrawlJobUrlEntity } from '../../database/entities/crawl-job-url.entity';
import { CrawlResultEntity } from '../../database/entities/crawl-result.entity';

@Injectable()
export class CrawlJobsService {
  private readonly connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
  private readonly queue = new Queue<CrawlQueuePayload>('crawl.queue', { connection: this.connection });

  constructor(
    private readonly store: CrawlRedisStore,
    @InjectRepository(CrawlJobEntity) private readonly jobs: Repository<CrawlJobEntity>,
    @InjectRepository(CrawlJobUrlEntity) private readonly urlsRepo: Repository<CrawlJobUrlEntity>,
    @InjectRepository(CrawlResultEntity) private readonly results: Repository<CrawlResultEntity>,
  ) {}

  async create(input: { organizationId: string; urls: string[]; maxPagesPerSite?: number; priority?: number }) {
    const urls = [...new Set((input.urls ?? []).map(v => v.trim()).filter(Boolean))];
    if (!urls.length) throw new BadRequestException('At least one URL is required');
    if (urls.length > 5000) throw new BadRequestException('Maximum 5000 URLs per job');
    const maxPagesPerSite = Math.min(Math.max(Number(input.maxPagesPerSite ?? 3), 1), 10);
    const priority = Math.min(Math.max(Number(input.priority ?? 0), 0), 100);
    const state = await this.store.create(input.organizationId, urls, maxPagesPerSite, priority);
    await this.jobs.save(this.jobs.create({ id: state.id, organizationId: state.organizationId, status: 'QUEUED', totalUrls: state.totalUrls, maxPagesPerSite, priority }));
    await this.urlsRepo.save(state.urls.map(item => this.urlsRepo.create({ id: item.id, crawlJobId: state.id, organizationId: state.organizationId, url: item.url, normalizedUrl: this.normalize(item.url), status: 'QUEUED' })));
    await Promise.all(state.urls.map(item => this.queue.add('crawl-url', {
      crawlJobId: state.id, crawlUrlId: item.id, organizationId: state.organizationId, url: item.url, maxPagesPerSite,
    }, {
      jobId: randomUUID(), priority: Math.max(1, 101 - priority), removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 },
      attempts: 3, backoff: { type: 'exponential', delay: 3000 },
    })));
    return this.snapshot(state);
  }

  async list(organizationId: string) {
    const rows = await this.jobs.find({ where: { organizationId }, order: { createdAt: 'DESC' } });
    return rows.map(j => ({ ...j, progress: j.totalUrls ? Math.round(j.processedUrls / j.totalUrls * 100) : 0 }));
  }

  async get(organizationId: string, id: string) {
    const job = await this.jobs.findOne({ where: { id, organizationId } });
    if (!job) throw new NotFoundException('Crawl job not found');
    const urls = await this.urlsRepo.find({ where: { crawlJobId: id, organizationId }, order: { url: 'ASC' } });
    return { ...job, progress: job.totalUrls ? Math.round(job.processedUrls / job.totalUrls * 100) : 0, urls };
  }

  async getResults(organizationId: string, id: string) {
    const job = await this.jobs.findOne({ where: { id, organizationId } });
    if (!job) throw new NotFoundException('Crawl job not found');
    return this.results.find({ where: { organizationId, crawlJobId: id }, order: { createdAt: 'DESC' } });
  }

  async cancel(organizationId: string, id: string) {
    const job = await this.jobs.findOne({ where: { id, organizationId } });
    if (!job) throw new NotFoundException('Crawl job not found');
    job.status = 'CANCELLED'; job.completedAt = new Date(); await this.jobs.save(job);
    await this.store.cancel(id);
    await this.urlsRepo.update({ crawlJobId: id, organizationId, status: 'QUEUED' }, { status: 'CANCELLED', completedAt: new Date() });
    const waiting = await this.queue.getJobs(['waiting', 'delayed'], 0, -1);
    await Promise.all(waiting.filter(j => j.data.crawlJobId === id).map(j => j.remove().catch(() => undefined)));
    return this.get(organizationId, id);
  }

  private snapshot(state: CrawlState) { return { ...state, progress: state.totalUrls ? Math.round(state.processedUrls / state.totalUrls * 100) : 0 }; }
  private normalize(raw: string) { const u = new URL(raw); u.hash = ''; return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, ''); }
  async onApplicationShutdown() { await this.queue.close(); await this.connection.quit(); }
}
