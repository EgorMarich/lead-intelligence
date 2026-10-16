import { DataSource, Repository } from 'typeorm';
import { BusinessStatus, calculateLeadScore, ContactType } from '@lead/domain';
import { BusinessEntity } from '../../api/src/database/entities/business.entity';
import { ContactEntity } from '../../api/src/database/entities/contact.entity';
import { WebsiteEntity } from '../../api/src/database/entities/website.entity';
import { BusinessFeatureEntity } from '../../api/src/database/entities/business-feature.entity';
import { LeadScoreEntity } from '../../api/src/database/entities/lead-score.entity';
import { LeadEntity } from '../../api/src/database/entities/lead.entity';
import { CrawlResultEntity } from '../../api/src/database/entities/crawl-result.entity';
import { CrawlJobEntity } from '../../api/src/database/entities/crawl-job.entity';
import { CrawlJobUrlEntity } from '../../api/src/database/entities/crawl-job-url.entity';
import { WebsiteAnalysisEntity } from '../../api/src/database/entities/website-analysis.entity';
import { CrawledPage } from './crawler.adapter';

export class CrawlPersistenceService {
  private businesses!: Repository<BusinessEntity>;
  private contacts!: Repository<ContactEntity>;
  private websites!: Repository<WebsiteEntity>;
  private features!: Repository<BusinessFeatureEntity>;
  private scores!: Repository<LeadScoreEntity>;
  private leads!: Repository<LeadEntity>;
  private results!: Repository<CrawlResultEntity>;
  private analyses!: Repository<WebsiteAnalysisEntity>;
  private jobs!: Repository<CrawlJobEntity>;
  private urls!: Repository<CrawlJobUrlEntity>;

  constructor(private readonly db: DataSource) {
    this.businesses = db.getRepository(BusinessEntity); this.contacts = db.getRepository(ContactEntity);
    this.websites = db.getRepository(WebsiteEntity); this.features = db.getRepository(BusinessFeatureEntity);
    this.scores = db.getRepository(LeadScoreEntity); this.leads = db.getRepository(LeadEntity);
    this.results = db.getRepository(CrawlResultEntity); this.analyses = db.getRepository(WebsiteAnalysisEntity);
    this.jobs = db.getRepository(CrawlJobEntity); this.urls = db.getRepository(CrawlJobUrlEntity);
  }

  async persistSuccess(input: { organizationId: string; crawlJobId: string; crawlJobUrlId: string; requestedUrl: string; page: CrawledPage }) {
    const page = input.page;
    const normalizedUrl = this.normalizeUrl(page.url);
    const domain = new URL(page.url).hostname.toLowerCase();
    const result = await this.results.save(this.results.create({ organizationId: input.organizationId, crawlJobId: input.crawlJobId, crawlJobUrlId: input.crawlJobUrlId, requestedUrl: input.requestedUrl, finalUrl: page.url, normalizedUrl, domain, httpStatus: page.statusCode, title: page.title, description: page.description, language: page.language, ssl: page.url.startsWith('https:'), technologies: page.technologies, contacts: page.social ? { emails: page.emails, phones: page.phones, social: page.social } : { emails: page.emails, phones: page.phones }, signals: page.signals, links: page.links, pages: 1 }));

    let website = await this.websites.findOne({ where: { normalizedUrl } });
    let business: BusinessEntity | null = website ? await this.businesses.findOne({ where: { id: website.businessId, organizationId: input.organizationId } }) : null;
    if (!business) business = await this.businesses.findOne({ where: { organizationId: input.organizationId, website: page.url } });
    if (!business) {
      const name = this.businessName(page.title, domain);
      business = this.businesses.create({ organizationId: input.organizationId, name, city: 'Не указан', website: page.url, countryCode: 'RU', status: BusinessStatus.UNKNOWN });
    }
    business.website = page.url; business.description = page.description || business.description;
    business.enrichmentStatus = 'COMPLETED'; business.enrichedAt = new Date(); business.enrichmentVersion = 2; business.enrichmentError = undefined;
    business.updatedAt = new Date();
    business = await this.businesses.save(business);

    if (!website) {
      website = this.websites.create({ businessId: business.id, url: page.url, normalizedUrl, domain, title: page.title, description: page.description, httpStatus: page.statusCode, lastCheckedAt: new Date() });
    } else {
      website.businessId = business.id; website.url = page.url; website.title = page.title; website.description = page.description; website.httpStatus = page.statusCode; website.lastCheckedAt = new Date();
    }
    website = await this.websites.save(website);

    const emails = page.emails.slice(0, 20); const phones = page.phones.slice(0, 20);
    const social = page.social;
    const contactInputs: Array<{type: ContactType; value: string}> = [
      ...emails.map(value => ({ type: ContactType.EMAIL, value })), ...phones.map(value => ({ type: ContactType.PHONE, value })),
      ...social.telegram.map(value => ({ type: ContactType.TELEGRAM, value })), ...social.vk.map(value => ({ type: ContactType.VK, value })),
      ...social.whatsapp.map(value => ({ type: ContactType.WHATSAPP, value })), ...social.instagram.map(value => ({ type: ContactType.INSTAGRAM, value })),
    ];
    for (const contact of contactInputs) {
      const normalizedValue = contact.value.toLowerCase().replace(/\s+/g, '');
      const exists = await this.contacts.findOne({ where: { businessId: business.id, type: contact.type, normalizedValue } });
      if (!exists) await this.contacts.save(this.contacts.create({ businessId: business.id, type: contact.type, value: contact.value, normalizedValue, isPrimary: false }));
    }

    const score = calculateLeadScore({ hasOnlineBooking: page.signals.onlineBooking, hasWebsite: true, hasTelegram: social.telegram.length > 0, hasVk: social.vk.length > 0, hasWhatsapp: social.whatsapp.length > 0, hasEmail: emails.length > 0, reviewsCount: business.reviewsCount ?? 0, employeeCount: business.employeeCount });
    await this.scores.save(this.scores.create({ businessId: business.id, score: score.score, grade: score.grade, reasons: score.reasons }));
    const existingLead = await this.leads.findOne({ where: { organizationId: input.organizationId, businessId: business.id } });
    let lead = existingLead;
    if (lead) { lead.score = score.score; lead.grade = score.grade; lead.scoreReasons = score.reasons; lead.updatedAt = new Date(); lead = await this.leads.save(lead); }
    else lead = await this.leads.save(this.leads.create({ organizationId: input.organizationId, businessId: business.id, status: 'NEW', score: score.score, grade: score.grade, scoreReasons: score.reasons, tags: [] }));

    for (const technology of page.technologies) {
      const key = `TECH:${technology}`;
      const existing = await this.features.findOne({ where: { businessId: business.id, feature: key } });
      if (existing) { existing.value = true; existing.confidence = 0.95; existing.detectedAt = new Date(); existing.source = 'CRAWLER'; await this.features.save(existing); }
      else await this.features.save(this.features.create({ businessId: business.id, feature: key, value: true, confidence: 0.9, source: 'CRAWLER' }));
    }
    for (const [feature, value] of [['ONLINE_BOOKING', page.signals.onlineBooking], ['TELEGRAM', social.telegram.length > 0], ['VK', social.vk.length > 0], ['WHATSAPP', social.whatsapp.length > 0], ['WEBSITE', true]] as const) {
      const existing = await this.features.findOne({ where: { businessId: business.id, feature } });
      if (existing) { existing.value = value; existing.confidence = 0.9; existing.detectedAt = new Date(); await this.features.save(existing); }
      else await this.features.save(this.features.create({ businessId: business.id, feature, value, confidence: 0.9, source: 'CRAWLER' }));
    }
    await this.analyses.save(this.analyses.create({ organizationId: input.organizationId, websiteId: website.id, crawlResultId: result.id, language: page.language, technologies: page.technologies, contacts: { emails, phones, social }, signals: page.signals, links: page.links, ssl: page.url.startsWith('https:') }));
    return { resultId: result.id, businessId: business.id, leadId: lead.id, score: score.score, grade: score.grade };
  }

  async markUrl(input: { organizationId: string; crawlJobId: string; crawlJobUrlId: string; status: 'COMPLETED'|'FAILED'; httpStatus?: number; error?: string }) {
    const item = await this.urls.findOne({ where: { id: input.crawlJobUrlId, crawlJobId: input.crawlJobId, organizationId: input.organizationId } });
    if (item) { item.status = input.status; item.httpStatus = input.httpStatus; item.error = input.error; item.completedAt = new Date(); await this.urls.save(item); }
    const job = await this.jobs.findOne({ where: { id: input.crawlJobId, organizationId: input.organizationId } });
    if (job) {
      const all = await this.urls.find({ where: { crawlJobId: input.crawlJobId, organizationId: input.organizationId } });
      job.processedUrls = all.filter(x => x.status === 'COMPLETED' || x.status === 'FAILED').length;
      job.failedUrls = all.filter(x => x.status === 'FAILED').length;
      job.status = job.processedUrls >= job.totalUrls ? (job.failedUrls === job.totalUrls ? 'FAILED' : 'COMPLETED') : 'RUNNING';
      if (job.status === 'COMPLETED' || job.status === 'FAILED') job.completedAt = new Date();
      await this.jobs.save(job);
    }
  }

  private normalizeUrl(raw: string) { const u = new URL(raw); u.hash = ''; return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, ''); }
  private businessName(title: string | undefined, domain: string) { const clean = (title ?? '').replace(/\s+/g, ' ').trim().replace(/\s*[|–—-]\s*(главная|home|официальный сайт|официальный сайт компании).*$/i, ''); return clean.slice(0, 180) || domain.replace(/^www\./, ''); }
}
