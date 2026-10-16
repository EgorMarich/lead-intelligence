import { CrawledPage } from './crawler.adapter';

export type CrawlJobStatus = 'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'|'CANCELLED';

export type CrawlJob = {
  id: string;
  organizationId: string;
  status: CrawlJobStatus;
  totalUrls: number;
  processedUrls: number;
  failedUrls: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  results?: CrawledPage[];
};
