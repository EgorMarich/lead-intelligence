import { Injectable } from '@nestjs/common';
import { CrawlQueue } from './queue.port';

@Injectable()
export class InMemoryCrawlQueue implements CrawlQueue {
  readonly items: Array<{
    jobId: string;
    payload: { url: string; maxPagesPerSite: number; priority: number };
  }> = [];

  async enqueue(jobId: string, payload: {
    url: string;
    maxPagesPerSite: number;
    priority: number;
  }) {
    this.items.push({ jobId, payload });
  }

  async cancel(jobId: string) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].jobId === jobId) this.items.splice(i, 1);
    }
  }
}
