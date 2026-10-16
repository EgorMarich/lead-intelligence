import { Module } from '@nestjs/common'; import { CrawlController } from './crawl.controller'; import { CrawlQueue } from './crawl.queue'; import { CrawlWorker } from './crawl.worker';
@Module({controllers:[CrawlController],providers:[CrawlQueue,CrawlWorker],exports:[CrawlQueue,CrawlWorker]}) export class CrawlModule {}
