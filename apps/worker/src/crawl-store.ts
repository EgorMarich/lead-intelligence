import IORedis from 'ioredis';
import { CrawlState } from './crawl-state.types';

export class CrawlStore {
  constructor(private readonly redis: IORedis, private readonly prefix = 'lead:crawl:') {}
  key(id: string) { return `${this.prefix}job:${id}`; }
  async get(id: string): Promise<CrawlState | null> { const raw = await this.redis.get(this.key(id)); return raw ? JSON.parse(raw) : null; }
  async update(id: string, mutate: (state: CrawlState) => void) {
    const key=this.key(id);
    for(let attempt=0;attempt<5;attempt++){
      await this.redis.watch(key); const raw=await this.redis.get(key);
      if(!raw){await this.redis.unwatch();return null;}
      const state:CrawlState=JSON.parse(raw); mutate(state);
      const result=await this.redis.multi().set(key,JSON.stringify(state)).exec();
      if(result)return state;
    }
    throw new Error('Could not update crawl state due to concurrent writes');
  }
}
