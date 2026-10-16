import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { DataSource, Repository } from 'typeorm';
import { QUEUES, EnrichmentQueuePayload } from '@lead/shared';
import { BusinessEntity } from '../../api/src/database/entities/business.entity';
import { WebsiteEntity } from '../../api/src/database/entities/website.entity';
import { ContactEntity } from '../../api/src/database/entities/contact.entity';
import { BusinessFeatureEntity } from '../../api/src/database/entities/business-feature.entity';
import { LeadScoreEntity } from '../../api/src/database/entities/lead-score.entity';
import { LeadEntity } from '../../api/src/database/entities/lead.entity';
import { EnrichmentJobEntity } from '../../api/src/database/entities/enrichment-job.entity';
import { ContactType, calculateLeadScore } from '@lead/domain';
import { BrowserCrawlerAdapter } from './crawler.adapter';

export function createEnrichmentWorker(connection: IORedis, db: DataSource) {
  const crawler = new BrowserCrawlerAdapter();
  const jobs = db.getRepository(EnrichmentJobEntity);
  const businesses = db.getRepository(BusinessEntity);
  const websites = db.getRepository(WebsiteEntity);
  const contacts = db.getRepository(ContactEntity);
  const features = db.getRepository(BusinessFeatureEntity);
  const scores = db.getRepository(LeadScoreEntity);
  const leads = db.getRepository(LeadEntity);

  const worker = new Worker<EnrichmentQueuePayload>(QUEUES.ENRICHMENT, async (queueJob) => {
    const input = queueJob.data;
    const job = await jobs.findOne({ where: { id: input.enrichmentJobId, organizationId: input.organizationId, businessId: input.businessId } });
    const business = await businesses.findOne({ where: { id: input.businessId, organizationId: input.organizationId } });
    if (!job || !business) throw new Error('Enrichment target not found');

    job.status = 'RUNNING'; job.attempts += 1; job.startedAt = new Date(); job.error = undefined;
    business.enrichmentStatus = 'RUNNING'; business.enrichmentError = undefined;
    await jobs.save(job); await businesses.save(business);

    try {
      const page = await crawler.crawl(input.url);
      const social = page.social;
      const emails = page.emails.slice(0, 20);
      const phones = page.phones.slice(0, 20);
      const detected = [
        ['ONLINE_BOOKING', page.signals.onlineBooking], ['TELEGRAM', social.telegram.length > 0],
        ['VK', social.vk.length > 0], ['WHATSAPP', social.whatsapp.length > 0], ['INSTAGRAM', social.instagram.length > 0],
        ['WEBSITE', true], ['CONTACT_PAGE', page.signals.contactPage], ['ANALYTICS', page.signals.analytics], ['ECOMMERCE', page.signals.ecommerce],
      ] as const;
      for (const [feature, value] of detected) {
        let row = await features.findOne({ where: { businessId: business.id, feature } });
        if (!row) row = features.create({ businessId: business.id, feature, value, confidence: 0.9, source: 'ENRICHMENT' });
        else { row.value = value; row.confidence = 0.95; row.source = 'ENRICHMENT'; row.detectedAt = new Date(); }
        await features.save(row);
      }
      for (const technology of page.technologies) {
        const key = `TECH:${technology}`;
        let row = await features.findOne({ where: { businessId: business.id, feature: key } });
        if (!row) row = features.create({ businessId: business.id, feature: key, value: true, confidence: 0.9, source: 'ENRICHMENT' });
        else { row.value = true; row.confidence = 0.95; row.detectedAt = new Date(); }
        await features.save(row);
      }
      const inputs: Array<{ type: ContactType; value: string }> = [
        ...emails.map(value => ({ type: ContactType.EMAIL, value })), ...phones.map(value => ({ type: ContactType.PHONE, value })),
        ...social.telegram.map(value => ({ type: ContactType.TELEGRAM, value })), ...social.vk.map(value => ({ type: ContactType.VK, value })),
        ...social.whatsapp.map(value => ({ type: ContactType.WHATSAPP, value })), ...social.instagram.map(value => ({ type: ContactType.INSTAGRAM, value })),
      ];
      for (const item of inputs) {
        const normalizedValue = item.value.toLowerCase().replace(/\s+/g, '');
        const exists = await contacts.findOne({ where: { businessId: business.id, type: item.type, normalizedValue } });
        if (!exists) await contacts.save(contacts.create({ businessId: business.id, type: item.type, value: item.value, normalizedValue, isPrimary: false }));
      }
      let website = await websites.findOne({ where: { businessId: business.id, isActive: true } });
      const u = new URL(page.url); const normalizedUrl = `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, '');
      if (!website) website = websites.create({ businessId: business.id, url: page.url, normalizedUrl, domain: u.hostname });
      website.url = page.url; website.normalizedUrl = normalizedUrl; website.domain = u.hostname; website.title = page.title; website.description = page.description; website.httpStatus = page.statusCode; website.lastCheckedAt = new Date();
      await websites.save(website);

      const result = calculateLeadScore({ hasOnlineBooking: page.signals.onlineBooking, hasWebsite: true, hasTelegram: social.telegram.length > 0, hasVk: social.vk.length > 0, hasWhatsapp: social.whatsapp.length > 0, hasEmail: emails.length > 0, reviewsCount: business.reviewsCount ?? 0, employeeCount: business.employeeCount });
      await scores.save(scores.create({ businessId: business.id, score: result.score, grade: result.grade, reasons: result.reasons }));
      let lead = await leads.findOne({ where: { organizationId: input.organizationId, businessId: business.id } });
      if (!lead) lead = leads.create({ organizationId: input.organizationId, businessId: business.id, status: 'NEW', score: result.score, grade: result.grade, scoreReasons: result.reasons, tags: [] });
      else { lead.score = result.score; lead.grade = result.grade; lead.scoreReasons = result.reasons; lead.updatedAt = new Date(); }
      await leads.save(lead);

      business.website = page.url; business.description = page.description || business.description; business.enrichmentStatus = 'COMPLETED'; business.enrichedAt = new Date(); business.enrichmentVersion = 2; business.enrichmentError = undefined; business.updatedAt = new Date();
      await businesses.save(business);
      job.status = 'COMPLETED'; job.finishedAt = new Date(); job.result = { technologies: page.technologies, emails: emails.length, phones: phones.length, social: { telegram: social.telegram.length, vk: social.vk.length, whatsapp: social.whatsapp.length, instagram: social.instagram.length }, onlineBooking: page.signals.onlineBooking, score: result.score, grade: result.grade };
      await jobs.save(job);
      return job.result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      job.status = 'FAILED'; job.error = message; job.finishedAt = new Date(); await jobs.save(job);
      business.enrichmentStatus = 'FAILED'; business.enrichmentError = message; business.updatedAt = new Date(); await businesses.save(business);
      throw error;
    }
  }, { connection, concurrency: Number(process.env.ENRICHMENT_CONCURRENCY ?? 2) });

  return { worker, crawler };
}
