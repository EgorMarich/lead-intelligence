import IORedis from 'ioredis';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type CrawlStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type CrawlUrlStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type CrawlUrlState = { id: string; url: string; status: CrawlUrlStatus; error?: string };
export type CrawlState = {
  id: string; organizationId: string; status: CrawlStatus; createdAt: string; startedAt?: string; completedAt?: string;
  totalUrls: number; processedUrls: number; failedUrls: number; maxPagesPerSite: number; priority: number;
  urls: CrawlUrlState[]; results?: Record<string, unknown>; error?: string;
};

@Injectable()
export class CrawlRedisStore implements OnApplicationShutdown {
  private readonly redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  private readonly prefix = 'lead:crawl:';

  async create(organizationId: string, urls: string[], maxPagesPerSite: number, priority: number): Promise<CrawlState> {
    const state: CrawlState = {
      id: randomUUID(), organizationId, status: 'QUEUED', createdAt: new Date().toISOString(),
      totalUrls: urls.length, processedUrls: 0, failedUrls: 0, maxPagesPerSite, priority,
      urls: urls.map(url => ({ id: randomUUID(), url, status: 'QUEUED' })), results: {},
    };
    await this.redis.set(this.key(state.id), JSON.stringify(state));
    return state;
  }

  async get(id: string): Promise<CrawlState | null> {
    const raw = await this.redis.get(this.key(id));
    return raw ? JSON.parse(raw) : null;
  }

  async list(organizationId: string): Promise<CrawlState[]> {
    const keys: string[] = [];
    for await (const key of this.redis.scanStream({ match: `${this.prefix}job:*`, count: 100 })) keys.push(...(key as string[]));
    const states = await Promise.all(keys.map(k => this.redis.get(k)));
    return states.filter(Boolean).map(v => JSON.parse(v!)).filter((v: CrawlState) => v.organizationId === organizationId).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }

  async update(id: string, mutate: (state: CrawlState) => void): Promise<CrawlState | null> {
    const key = this.key(id);
    for (let attempt = 0; attempt < 5; attempt++) {
      await this.redis.watch(key);
      const raw = await this.redis.get(key);
      if (!raw) { await this.redis.unwatch(); return null; }
      const current: CrawlState = JSON.parse(raw);
      mutate(current);
      const tx = this.redis.multi().set(key, JSON.stringify(current));
      const result = await tx.exec();
      if (result) return current;
    }
    throw new Error('Could not update crawl state due to concurrent writes');
  }

  async cancel(id: string): Promise<CrawlState | null> {
    return this.update(id, state => {
      if (['COMPLETED','FAILED','CANCELLED'].includes(state.status)) return;
      state.status = 'CANCELLED'; state.completedAt = new Date().toISOString();
      state.urls.forEach(item => { if (item.status === 'QUEUED' || item.status === 'RUNNING') item.status = 'CANCELLED'; });
    });
  }

  key(id: string) { return `${this.prefix}job:${id}`; }

  async onApplicationShutdown() { await this.redis.quit(); }
}
