import { api } from './api';

export type CrawlJob = {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  totalUrls: number;
  processedUrls: number;
  failedUrls: number;
  progress: number;
  createdAt: string;
  maxPagesPerSite: number;
  priority: number;
};

export async function createCrawlJob(urls: string[], maxPagesPerSite = 3) {
  const { data } = await api.post<CrawlJob>('/crawl-jobs', {
    urls,
    maxPagesPerSite,
  });
  return data;
}

export async function getCrawlJobs() {
  const { data } = await api.get<CrawlJob[]>('/crawl-jobs');
  return data;
}

export async function cancelCrawlJob(id: string) {
  const { data } = await api.post<CrawlJob>(`/crawl-jobs/${id}/cancel`);
  return data;
}
