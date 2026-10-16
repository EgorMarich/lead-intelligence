export type UUID = string;

export const QUEUES = {
  SEARCH: 'search.queue',
  ENRICHMENT: 'enrichment.queue',
  SCORING: 'scoring.queue',
  EXPORT: 'export.queue',
  CRAWL: 'crawl.queue',
  OUTREACH: 'outreach.queue',
  COMMUNICATION_ANALYSIS: 'communication-analysis.queue',
  SEQUENCE: 'sequence.queue',
} as const;

export interface SearchParams { cityId: UUID; categoryId: UUID; query?: string; limit?: number; }
export interface RawBusiness { externalId?: string; name: string; city: string; category?: string; address?: string; phone?: string; email?: string; website?: string; rating?: number; reviewsCount?: number; sourceUrl?: string; }

export type EnrichmentQueuePayload = {
  enrichmentJobId: UUID;
  organizationId: UUID;
  businessId: UUID;
  url: string;
};

export type CrawlQueuePayload = {
  crawlJobId: UUID;
  crawlUrlId: UUID;
  organizationId: UUID;
  url: string;
  maxPagesPerSite: number;
};

export * from './discovery-filters';

export type OutreachQueuePayload = { messageId: UUID; organizationId: UUID };

export type CommunicationAnalysisQueuePayload = { messageId: string; organizationId: string };

export type SequenceQueuePayload = { enrollmentId: UUID; organizationId: UUID; stepIndex: number };
