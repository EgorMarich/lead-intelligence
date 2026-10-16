export const CRAWL_QUEUE = Symbol('CRAWL_QUEUE');

export interface CrawlQueue {
  enqueue(jobId: string, payload: {
    url: string;
    maxPagesPerSite: number;
    priority: number;
  }): Promise<void>;

  cancel(jobId: string): Promise<void>;
}
