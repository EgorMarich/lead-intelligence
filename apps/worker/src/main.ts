import 'reflect-metadata';
import { createOutreachWorker } from './outreach/outreach-worker';
import { createSequenceWorker } from './sequence-worker';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { QUEUES } from '@lead/shared';
import { BusinessStatus, calculateLeadScore, ContactType } from '@lead/domain';
import { MockBusinessSource } from './collector';
import { normalizeLead } from './lead-processing';
import { SearchJobEntity } from '../../api/src/database/entities/search-job.entity';
import { RawLeadEntity } from '../../api/src/database/entities/raw-lead.entity';
import { BusinessEntity } from '../../api/src/database/entities/business.entity';
import { LeadScoreEntity } from '../../api/src/database/entities/lead-score.entity';
import { ContactEntity } from '../../api/src/database/entities/contact.entity';
import { WebsiteEntity } from '../../api/src/database/entities/website.entity';
import { BusinessFeatureEntity } from '../../api/src/database/entities/business-feature.entity';
import { createCrawlWorker } from './crawl-worker';
import { CrawlJobEntity } from '../../api/src/database/entities/crawl-job.entity';
import { CrawlJobUrlEntity } from '../../api/src/database/entities/crawl-job-url.entity';
import { CrawlResultEntity } from '../../api/src/database/entities/crawl-result.entity';
import { WebsiteAnalysisEntity } from '../../api/src/database/entities/website-analysis.entity';
import { LeadEntity } from '../../api/src/database/entities/lead.entity';
import { EnrichmentJobEntity } from '../../api/src/database/entities/enrichment-job.entity';
import { OutreachMessageEntity } from '../../api/src/database/entities/outreach-message.entity';
import { OutreachTemplateEntity } from '../../api/src/database/entities/outreach-template.entity';
import { ConversationThreadEntity } from '../../api/src/database/entities/conversation-thread.entity';
import { CommunicationMessageEntity } from '../../api/src/database/entities/communication-message.entity';
import { SalesSequenceEntity } from '../../api/src/database/entities/sales-sequence.entity';
import { SequenceEnrollmentEntity } from '../../api/src/database/entities/sequence-enrollment.entity';
import { AiSalesDecisionEntity } from '../../api/src/database/entities/ai-sales-decision.entity';
import { ContactEntity } from '../../api/src/database/entities/contact.entity';
import { createEnrichmentWorker } from './enrichment-worker';
import { matchesDiscoveryFilters } from './discovery-filter';
import { startHealthServer } from './health-server';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const db = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [SearchJobEntity, RawLeadEntity, BusinessEntity, LeadScoreEntity, ContactEntity, WebsiteEntity, BusinessFeatureEntity, CrawlJobEntity, CrawlJobUrlEntity, CrawlResultEntity, WebsiteAnalysisEntity, LeadEntity, EnrichmentJobEntity, OutreachMessageEntity, OutreachTemplateEntity, ConversationThreadEntity, CommunicationMessageEntity, SalesSequenceEntity, SequenceEnrollmentEntity, AiSalesDecisionEntity],
  synchronize: false,
});
const source = new MockBusinessSource();
const crawlQueue = new Queue(QUEUES.CRAWL, { connection });

function payloadBoolean(payload: Record<string, unknown>, ...keys: string[]) {
  return keys.some((key) => payload[key] === true || payload[key] === 'true');
}

async function enrich(raw: RawLeadEntity, repositories: {
  businesses: Repository<BusinessEntity>;
  scores: Repository<LeadScoreEntity>;
  contacts: Repository<ContactEntity>;
  websites: Repository<WebsiteEntity>;
  features: Repository<BusinessFeatureEntity>;
}) {
  const existing = await repositories.businesses.findOne({ where: { organizationId: raw.organizationId, name: raw.name, city: raw.city ?? '' } });
  const business = existing ?? repositories.businesses.create({ organizationId: raw.organizationId, name: raw.name, city: raw.city ?? 'Не указан' });
  business.categoryId = undefined;
  business.address = raw.address;
  business.website = raw.website;
  business.rating = raw.rating;
  business.reviewsCount = raw.reviewsCount;
  business.countryCode = 'RU';
  business.status = BusinessStatus.UNKNOWN;
  const saved = await repositories.businesses.save(business);

  const payload = raw.rawPayload ?? {};
  const hasTelegram = payloadBoolean(payload, 'telegram', 'hasTelegram') || typeof payload.telegram === 'string';
  const hasVk = payloadBoolean(payload, 'vk', 'hasVk') || typeof payload.vk === 'string';
  const hasWhatsapp = payloadBoolean(payload, 'whatsapp', 'hasWhatsapp') || typeof payload.whatsapp === 'string';
  const hasOnlineBooking = payloadBoolean(payload, 'onlineBooking', 'hasOnlineBooking') || Boolean(payload.bookingUrl);
  const employeeCount = typeof payload.employeeCount === 'number' ? payload.employeeCount : undefined;

  const result = calculateLeadScore({
    hasOnlineBooking,
    hasWebsite: Boolean(raw.website),
    hasTelegram,
    hasVk,
    hasWhatsapp,
    hasEmail: Boolean(raw.email),
    reviewsCount: raw.reviewsCount ?? 0,
    employeeCount,
  });

  const previous = await repositories.scores.findOne({ where: { businessId: saved.id }, order: { calculatedAt: 'DESC' } });
  const score = repositories.scores.create({
    businessId: saved.id,
    score: result.score,
    grade: result.grade,
    reasons: result.reasons,
  });
  await repositories.scores.save(score);
  if (previous && previous.score === score.score && previous.grade === score.grade) {
    await repositories.scores.delete(previous.id);
  }

  const contactInputs = [
    raw.phone ? { type: ContactType.PHONE, value: raw.phone } : null,
    raw.email ? { type: ContactType.EMAIL, value: raw.email } : null,
  ].filter(Boolean) as { type: ContactType; value: string }[];
  for (const contact of contactInputs) {
    const normalizedValue = contact.value.toLowerCase().replace(/\s+/g, '');
    const exists = await repositories.contacts.findOne({ where: { businessId: saved.id, type: contact.type, normalizedValue } });
    if (!exists) await repositories.contacts.save(repositories.contacts.create({ businessId: saved.id, type: contact.type, value: contact.value, normalizedValue, isPrimary: true }));
  }

  if (raw.website) {
    let url: URL | null = null;
    try { url = new URL(raw.website); } catch { url = null; }
    if (url) {
      const normalizedUrl = `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, '');
      const exists = await repositories.websites.findOne({ where: { normalizedUrl } });
      if (!exists) await repositories.websites.save(repositories.websites.create({ businessId: saved.id, url: raw.website, normalizedUrl, domain: url.hostname }));
    }
  }

  const detected = [
    ['ONLINE_BOOKING', hasOnlineBooking],
    ['TELEGRAM', hasTelegram],
    ['VK', hasVk],
    ['WHATSAPP', hasWhatsapp],
    ['WEBSITE', Boolean(raw.website)],
  ] as const;
  for (const [feature, value] of detected) {
    const existingFeature = await repositories.features.findOne({ where: { businessId: saved.id, feature } });
    if (existingFeature) {
      existingFeature.value = value;
      existingFeature.confidence = 0.9;
      await repositories.features.save(existingFeature);
    } else {
      await repositories.features.save(repositories.features.create({ businessId: saved.id, feature, value, confidence: 0.9, source: raw.source }));
    }
  }

  return { businessId: saved.id, score: result.score, grade: result.grade };
}

async function start() {
  const healthServer = startHealthServer();
  await db.initialize();
  const jobs = db.getRepository(SearchJobEntity);
  const rawLeads = db.getRepository(RawLeadEntity);
  const businesses = db.getRepository(BusinessEntity);
  const scores = db.getRepository(LeadScoreEntity);
  const contacts = db.getRepository(ContactEntity);
  const websites = db.getRepository(WebsiteEntity);
  const features = db.getRepository(BusinessFeatureEntity);

  const worker = new Worker(QUEUES.SEARCH, async (queueJob) => {
    const { searchJobId, organizationId } = queueJob.data as { searchJobId: string; organizationId: string };
    const searchJob = await jobs.findOneBy({ id: searchJobId, organizationId });
    if (!searchJob) throw new Error('Search job not found');
    searchJob.status = 'RUNNING' as any;
    searchJob.startedAt = new Date();
    await jobs.save(searchJob);

    let found = 0;
    const websiteUrls = new Set<string>();
    try {
      const params = { cityId: searchJob.cityId ?? '', categoryId: searchJob.categoryId ?? '', query: searchJob.query, limit: searchJob.limit };
      for await (const raw of source.search(params)) {
        const lead = normalizeLead(raw);
        if (!matchesDiscoveryFilters(lead as any, searchJob.filters as any)) continue;
        const savedRaw = rawLeads.create({ organizationId, searchJobId, source: source.name, externalId: lead.externalId, name: lead.name, category: lead.category, city: lead.city, address: lead.address, phone: lead.phone, email: lead.email, website: lead.website, rating: lead.rating, reviewsCount: lead.reviewsCount ?? 0, sourceUrl: lead.sourceUrl, rawPayload: lead as any });
        await rawLeads.upsert(savedRaw, ['organizationId', 'source', 'externalId']);
        const persisted = await rawLeads.findOne({ where: { organizationId, searchJobId, source: source.name, externalId: lead.externalId } });
        if (persisted) await enrich(persisted, { businesses, scores, contacts, websites, features });
        if (lead.website) websiteUrls.add(lead.website);
        found++;
        searchJob.processed = found;
        searchJob.totalFound = found;
        await jobs.save(searchJob);
      }
      if (websiteUrls.size) {
        const crawlJobId = randomUUID();
        const crawlJob = db.getRepository(CrawlJobEntity).create({ id: crawlJobId, organizationId, status: 'QUEUED', totalUrls: websiteUrls.size, maxPagesPerSite: 3, priority: 10 });
        await db.getRepository(CrawlJobEntity).save(crawlJob);
        const crawlUrls = [...websiteUrls].map(url => db.getRepository(CrawlJobUrlEntity).create({ id: randomUUID(), crawlJobId, organizationId, url, normalizedUrl: normalizeUrl(url), status: 'QUEUED' }));
        await db.getRepository(CrawlJobUrlEntity).save(crawlUrls);
        await Promise.all(crawlUrls.map(item => crawlQueue.add('crawl-url', { crawlJobId, crawlUrlId: item.id, organizationId, url: item.url, maxPagesPerSite: 3 }, { jobId: randomUUID(), priority: 91, attempts: 3, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } })));
      }
      searchJob.status = 'COMPLETED' as any;
      searchJob.finishedAt = new Date();
      searchJob.totalFound = found;
      searchJob.processed = found;
      await jobs.save(searchJob);
      return { count: found };
    } catch (error) {
      searchJob.status = 'FAILED' as any;
      searchJob.error = error instanceof Error ? error.message : String(error);
      searchJob.finishedAt = new Date();
      await jobs.save(searchJob);
      throw error;
    }
  }, { connection, concurrency: Number(process.env.WORKER_CONCURRENCY ?? 3) });

  worker.on('failed', (job, error) => console.error(JSON.stringify({ level: 'error', operation: 'search', jobId: job?.id, error: error.message })));
  const crawl = createCrawlWorker(connection);
  const enrichment = createEnrichmentWorker(connection, db);
  const outreach = createOutreachWorker(connection, db);
  const sequence = createSequenceWorker(connection, db);
  const shutdown = async () => { healthServer.close(); await outreach.close();
    await sequence.close(); await enrichment.worker.close(); await enrichment.crawler.close(); await crawl.worker.close(); await crawl.crawler.close(); await crawlQueue.close(); await db.destroy(); await connection.quit(); process.exit(0); };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  console.log(`Lead discovery + intelligence + enrichment + crawl worker started (crawl concurrency=${process.env.CRAWL_CONCURRENCY ?? 2}, enrichment concurrency=${process.env.ENRICHMENT_CONCURRENCY ?? 2})`);
}

start().catch((error) => { console.error(JSON.stringify({ level: 'fatal', event: 'worker_start_failed', error: error instanceof Error ? error.message : String(error) })); process.exit(1); });

function normalizeUrl(raw: string) { const u = new URL(raw); u.hash=''; return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, ''); }
