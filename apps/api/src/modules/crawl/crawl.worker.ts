import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { CrawlQueue } from './crawl.queue';
import { BrowserCrawlerAdapter } from './crawler.adapter';

@Injectable()
export class CrawlWorker implements OnApplicationShutdown {
  private readonly logger = new Logger(CrawlWorker.name);
  private readonly crawler = new BrowserCrawlerAdapter();

  constructor(private readonly queue: CrawlQueue) {}

  async process(org: string, id: string) {
    const job = this.queue.get(org, id);
    if (!job || job.status !== 'QUEUED') return job;

    this.queue.update(org, id, {
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      results: [],
    });

    for (const url of this.queue.getUrls(org, id) ?? []) {
      try {
        this.logger.log(`Crawling ${url}`);
        const result = await this.crawler.crawl(url);
        const current = this.queue.get(org, id);
        this.queue.update(org, id, {
          processedUrls: (current?.processedUrls ?? 0) + 1,
          results: [...(current?.results ?? []), result],
        });
      } catch (error: any) {
        this.logger.warn(`Crawl failed for ${url}: ${error?.message ?? error}`);
        const current = this.queue.get(org, id);
        this.queue.update(org, id, {
          processedUrls: (current?.processedUrls ?? 0) + 1,
          failedUrls: (current?.failedUrls ?? 0) + 1,
          error: current?.error ?? 'One or more URLs failed to crawl',
        });
      }
    }

    const finalJob = this.queue.get(org, id);
    this.queue.update(org, id, {
      status: finalJob?.processedUrls === 0 || finalJob?.failedUrls === finalJob?.totalUrls ? 'FAILED' : 'COMPLETED',
      completedAt: new Date().toISOString(),
    });
    return this.queue.get(org, id);
  }

  async onApplicationShutdown() {
    await this.crawler.close();
  }
}
