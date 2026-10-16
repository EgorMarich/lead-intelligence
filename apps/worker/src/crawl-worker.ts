import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUES, CrawlQueuePayload } from '@lead/shared';
import { BrowserCrawlerAdapter } from './crawler.adapter';
import { CrawlStore } from './crawl-store';
import { DataSource } from 'typeorm';
import { CrawlPersistenceService } from './crawl-persistence';

export function createCrawlWorker(connection: IORedis, db: DataSource) {
  const store = new CrawlStore(new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null }));
  const crawler = new BrowserCrawlerAdapter();
  const persistence = new CrawlPersistenceService(db);
  const concurrency = Number(process.env.CRAWL_CONCURRENCY ?? 2);

  const worker = new Worker<CrawlQueuePayload>(QUEUES.CRAWL, async (job: Job<CrawlQueuePayload>) => {
    const payload = job.data;
    const state = await store.get(payload.crawlJobId);
    if (!state) throw new Error('Crawl job state not found');
    if (state.status === 'CANCELLED') return { cancelled: true };

    await store.update(payload.crawlJobId, s => {
      if (s.status === 'QUEUED') { s.status='RUNNING'; s.startedAt=new Date().toISOString(); }
      const item=s.urls.find(x=>x.id===payload.crawlUrlId); if(item && item.status==='QUEUED') item.status='RUNNING';
    });
    await job.updateProgress(10);

    try {
      const result = await crawler.crawl(payload.url);
      const persisted = await persistence.persistSuccess({ organizationId: payload.organizationId, crawlJobId: payload.crawlJobId, crawlJobUrlId: payload.crawlUrlId, requestedUrl: payload.url, page: result });
      await persistence.markUrl({ organizationId: payload.organizationId, crawlJobId: payload.crawlJobId, crawlJobUrlId: payload.crawlUrlId, status: 'COMPLETED', httpStatus: result.statusCode });
      await store.update(payload.crawlJobId, s => {
        const item=s.urls.find(x=>x.id===payload.crawlUrlId);
        if(item){item.status='COMPLETED';}
        s.processedUrls = s.urls.filter(x=>x.status==='COMPLETED'||x.status==='FAILED').length;
        s.failedUrls = s.urls.filter(x=>x.status==='FAILED').length;
        s.results = {...(s.results??{}), [payload.crawlUrlId]: {...result, persistence: persisted}};
        if(s.processedUrls >= s.totalUrls){s.status=s.failedUrls===s.totalUrls?'FAILED':'COMPLETED';s.completedAt=new Date().toISOString();}
      });
      await job.updateProgress(100);
      return { url: payload.url, status: 'COMPLETED', ...persisted };
    } catch (error) {
      const message=error instanceof Error?error.message:String(error);
      await persistence.markUrl({ organizationId: payload.organizationId, crawlJobId: payload.crawlJobId, crawlJobUrlId: payload.crawlUrlId, status: 'FAILED', error: message });
      await store.update(payload.crawlJobId, s => {
        const item=s.urls.find(x=>x.id===payload.crawlUrlId);
        if(item){item.status='FAILED';item.error=message;}
        s.processedUrls = s.urls.filter(x=>x.status==='COMPLETED'||x.status==='FAILED').length;
        s.failedUrls = s.urls.filter(x=>x.status==='FAILED').length;
        s.error=s.error ?? 'One or more URLs failed to crawl';
        if(s.processedUrls >= s.totalUrls){s.status=s.failedUrls===s.totalUrls?'FAILED':'COMPLETED';s.completedAt=new Date().toISOString();}
      });
      throw error;
    }
  }, { connection, concurrency, limiter: { max: Number(process.env.CRAWL_RATE_LIMIT_MAX ?? 20), duration: Number(process.env.CRAWL_RATE_LIMIT_DURATION_MS ?? 1000) } });

  worker.on('failed',(job,error)=>console.error(JSON.stringify({level:'error',operation:'crawl',jobId:job?.id,error:error.message})));
  worker.on('error',error=>console.error(JSON.stringify({level:'error',operation:'crawl-worker',error:error.message})));
  return { worker, crawler, store };
}
