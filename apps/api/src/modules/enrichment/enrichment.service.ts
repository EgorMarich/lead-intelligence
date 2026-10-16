import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { QUEUES, EnrichmentQueuePayload } from '@lead/shared';
import { BusinessEntity } from '../../database/entities/business.entity';
import { WebsiteEntity } from '../../database/entities/website.entity';
import { EnrichmentJobEntity } from '../../database/entities/enrichment-job.entity';

@Injectable()
export class EnrichmentService {
  private readonly connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
  private readonly queue = new Queue<EnrichmentQueuePayload>(QUEUES.ENRICHMENT, { connection: this.connection });

  constructor(
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(WebsiteEntity) private readonly websites: Repository<WebsiteEntity>,
    @InjectRepository(EnrichmentJobEntity) private readonly jobs: Repository<EnrichmentJobEntity>,
  ) {}

  async enqueue(organizationId: string, businessId: string) {
    const business = await this.businesses.findOne({ where: { id: businessId, organizationId } });
    if (!business) throw new NotFoundException('Business not found');
    const website = await this.websites.findOne({ where: { businessId, isActive: true } });
    const url = website?.url ?? business.website;
    if (!url) throw new BadRequestException('Business has no website to enrich');
    const active = await this.jobs.findOne({ where: { organizationId, businessId, status: In(['QUEUED', 'RUNNING']) } });
    if (active) return active;
    const job = await this.jobs.save(this.jobs.create({ id: randomUUID(), organizationId, businessId, status: 'QUEUED', result: {} }));
    business.enrichmentStatus = 'QUEUED';
    business.enrichmentError = undefined;
    await this.businesses.save(business);
    await this.queue.add('enrich-business', { enrichmentJobId: job.id, organizationId, businessId, url }, { jobId: job.id, attempts: 3, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } });
    return job;
  }

  async get(organizationId: string, businessId: string) {
    const business = await this.businesses.findOne({ where: { id: businessId, organizationId } });
    if (!business) throw new NotFoundException('Business not found');
    const job = await this.jobs.findOne({ where: { organizationId, businessId }, order: { createdAt: 'DESC' } });
    return { business, job };
  }

  async onApplicationShutdown() { await this.queue.close(); await this.connection.quit(); }
}
