import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchJobEntity } from '../../database/entities/search-job.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { EnrichmentJobEntity } from '../../database/entities/enrichment-job.entity';
import { LeadEntity, PersistentLeadStatus } from '../../database/entities/lead.entity';
import { OutreachMessageEntity } from '../../database/entities/outreach-message.entity';
import { BusinessSourceEntity } from '../../database/entities/business-source.entity';
import { SourceEntity } from '../../database/entities/source.entity';
import { CategoryEntity } from '../../database/entities/category.entity';

const statuses: PersistentLeadStatus[] = ['NEW','CONTACTED','INTERESTED','NEGOTIATION','CONVERTED','LOST'];

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(SearchJobEntity) private readonly searches: Repository<SearchJobEntity>,
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(EnrichmentJobEntity) private readonly enrichments: Repository<EnrichmentJobEntity>,
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    @InjectRepository(OutreachMessageEntity) private readonly outreach: Repository<OutreachMessageEntity>,
    @InjectRepository(BusinessSourceEntity) private readonly businessSources: Repository<BusinessSourceEntity>,
    @InjectRepository(SourceEntity) private readonly sources: Repository<SourceEntity>,
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
  ) {}

  async overview(organizationId: string, from?: string, to?: string) {
    const range = this.range(from, to);

    const [searchAgg, businessCount, enrichmentAgg, leadCounts, leadMoney, outreachAgg] = await Promise.all([
      this.searches.createQueryBuilder('s')
        .select('COALESCE(SUM(s.totalFound),0)', 'found')
        .addSelect('COALESCE(SUM(s.processed),0)', 'processed')
        .addSelect('COALESCE(SUM(s.errors),0)', 'errors')
        .addSelect('COUNT(s.id)', 'jobs')
        .where('s.organizationId = :organizationId', { organizationId })
        .andWhere('s.createdAt >= :from AND s.createdAt < :to', range)
        .getRawOne(),
      this.businesses.createQueryBuilder('b').where('b.organizationId = :organizationId', { organizationId })
        .andWhere('b.createdAt >= :from AND b.createdAt < :to', range).getCount(),
      this.enrichments.createQueryBuilder('e')
        .select('COUNT(*) FILTER (WHERE e.status = :completed)', 'completed')
        .addSelect('COUNT(*) FILTER (WHERE e.status = :failed)', 'failed')
        .addSelect('COUNT(*)', 'total')
        .where('e.organizationId = :organizationId', { organizationId })
        .andWhere('e.createdAt >= :from AND e.createdAt < :to', range)
        .setParameters({ completed: 'COMPLETED', failed: 'FAILED' })
        .getRawOne(),
      this.leads.createQueryBuilder('l')
        .select('l.status', 'status').addSelect('COUNT(*)', 'count')
        .where('l.organizationId = :organizationId', { organizationId })
        .andWhere('l.createdAt >= :from AND l.createdAt < :to', range)
        .groupBy('l.status').getRawMany(),
      this.leads.createQueryBuilder('l')
        .select('COALESCE(SUM(l.dealValue),0)', 'pipeline')
        .addSelect('COALESCE(SUM(l.revenue),0)', 'revenue')
        .where('l.organizationId = :organizationId', { organizationId })
        .andWhere('l.createdAt >= :from AND l.createdAt < :to', range)
        .getRawOne(),
      this.outreach.createQueryBuilder('o')
        .select('COUNT(*) FILTER (WHERE o.status = :sent)', 'sent')
        .addSelect('COUNT(*) FILTER (WHERE o.status = :failed)', 'failed')
        .addSelect('COUNT(*)', 'total')
        .where('o.organizationId = :organizationId', { organizationId })
        .andWhere('o.createdAt >= :from AND o.createdAt < :to', range)
        .setParameters({ sent: 'SENT', failed: 'FAILED' })
        .getRawOne(),
    ]);

    const counts = Object.fromEntries(leadCounts.map((x: any) => [x.status, Number(x.count)]));
    const qualified = statuses.filter((s) => s !== 'LOST').reduce((n, s) => n + (counts[s] ?? 0), 0);
    const contacted = ['CONTACTED','INTERESTED','NEGOTIATION','CONVERTED'].reduce((n, s) => n + (counts[s] ?? 0), 0);
    const interested = ['INTERESTED','NEGOTIATION','CONVERTED'].reduce((n, s) => n + (counts[s] ?? 0), 0);
    const negotiation = ['NEGOTIATION','CONVERTED'].reduce((n, s) => n + (counts[s] ?? 0), 0);
    const converted = counts.CONVERTED ?? 0;
    const lost = counts.LOST ?? 0;
    const conversion = (a: number, b: number) => a ? Number(((b / a) * 100).toFixed(1)) : 0;

    const channelRows = await this.outreach.createQueryBuilder('o')
      .select('o.channel', 'channel')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COUNT(*) FILTER (WHERE o.status = :sent)', 'sent')
      .where('o.organizationId = :organizationId', { organizationId })
      .andWhere('o.createdAt >= :from AND o.createdAt < :to', range)
      .setParameters({ sent: 'SENT' })
      .groupBy('o.channel').orderBy('COUNT(*)', 'DESC').getRawMany();

    return {
      period: { from: range.from.toISOString(), to: range.to.toISOString() },
      discovery: {
        jobs: Number(searchAgg?.jobs ?? 0),
        found: Number(searchAgg?.found ?? 0),
        processed: Number(searchAgg?.processed ?? 0),
        errors: Number(searchAgg?.errors ?? 0),
        processingRate: conversion(Number(searchAgg?.found ?? 0), Number(searchAgg?.processed ?? 0)),
      },
      enrichment: {
        total: Number(enrichmentAgg?.total ?? 0),
        completed: Number(enrichmentAgg?.completed ?? 0),
        failed: Number(enrichmentAgg?.failed ?? 0),
        successRate: conversion(Number(enrichmentAgg?.total ?? 0), Number(enrichmentAgg?.completed ?? 0)),
      },
      funnel: {
        businesses: businessCount,
        qualified,
        contacted,
        interested,
        negotiation,
        converted,
        lost,
        rates: {
          qualifiedFromBusinesses: conversion(businessCount, qualified),
          contactedFromQualified: conversion(qualified, contacted),
          interestedFromContacted: conversion(contacted, interested),
          negotiationFromInterested: conversion(interested, negotiation),
          convertedFromNegotiation: conversion(negotiation, converted),
          overallConversion: conversion(businessCount, converted),
        },
        byStatus: counts,
      },
      outreach: {
        total: Number(outreachAgg?.total ?? 0),
        sent: Number(outreachAgg?.sent ?? 0),
        failed: Number(outreachAgg?.failed ?? 0),
        sendRate: conversion(Number(outreachAgg?.total ?? 0), Number(outreachAgg?.sent ?? 0)),
        byChannel: channelRows.map((x: any) => ({ channel: x.channel, total: Number(x.total), sent: Number(x.sent) })),
      },
      financial: { pipelineValue: Number(leadMoney?.pipeline ?? 0), convertedRevenue: Number(leadMoney?.revenue ?? 0), currency: 'RUB' },
    };
  }

  async breakdown(organizationId: string, dimension: string, from?: string, to?: string) {
    const range = this.range(from, to);
    if (dimension === 'city') {
      return this.leads.createQueryBuilder('l')
        .innerJoin(BusinessEntity, 'b', 'b.id = l.businessId AND b.organizationId = l.organizationId')
        .select('b.city', 'key').addSelect('COUNT(l.id)', 'leads')
        .addSelect(`COUNT(*) FILTER (WHERE l.status = 'CONVERTED')`, 'converted')
        .where('l.organizationId = :organizationId', { organizationId }).andWhere('l.createdAt >= :from AND l.createdAt < :to', range)
        .groupBy('b.city').orderBy('COUNT(l.id)', 'DESC').limit(20).getRawMany();
    }
    if (dimension === 'category') {
      return this.leads.createQueryBuilder('l')
        .innerJoin(BusinessEntity, 'b', 'b.id = l.businessId AND b.organizationId = l.organizationId')
        .leftJoin(CategoryEntity, 'c', 'c.id = b.categoryId')
        .select('COALESCE(c.name, \'Без категории\')', 'key').addSelect('COUNT(l.id)', 'leads')
        .addSelect(`COUNT(*) FILTER (WHERE l.status = 'CONVERTED')`, 'converted')
        .where('l.organizationId = :organizationId', { organizationId }).andWhere('l.createdAt >= :from AND l.createdAt < :to', range)
        .groupBy('c.name').orderBy('COUNT(l.id)', 'DESC').limit(20).getRawMany();
    }
    if (dimension === 'source') {
      return this.businessSources.createQueryBuilder('bs')
        .innerJoin(LeadEntity, 'l', 'l.businessId = bs.businessId AND l.organizationId = :organizationId', { organizationId })
        .innerJoin(SourceEntity, 's', 's.id = bs.sourceId')
        .select('s.type', 'key').addSelect('COUNT(DISTINCT l.id)', 'leads')
        .addSelect(`COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'CONVERTED')`, 'converted')
        .where('l.createdAt >= :from AND l.createdAt < :to', range)
        .groupBy('s.type').orderBy('COUNT(DISTINCT l.id)', 'DESC').limit(20).getRawMany();
    }
    return this.outreach.createQueryBuilder('o')
      .select('o.channel', 'key').addSelect('COUNT(*)', 'messages')
      .addSelect(`COUNT(*) FILTER (WHERE o.status = 'SENT')`, 'sent')
      .where('o.organizationId = :organizationId', { organizationId })
      .andWhere('o.createdAt >= :from AND o.createdAt < :to', range)
      .groupBy('o.channel').orderBy('COUNT(*)', 'DESC').getRawMany();
  }

  private range(from?: string, to?: string) {
    const end = to ? new Date(to) : new Date();
    if (Number.isNaN(end.getTime())) throw new Error('Invalid to date');
    const start = from ? new Date(from) : new Date(end.getTime() - 30 * 86400000);
    if (Number.isNaN(start.getTime()) || start >= end) throw new Error('Invalid analytics date range');
    return { from: start, to: end };
  }
}
