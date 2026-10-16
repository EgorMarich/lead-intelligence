import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlJobsController } from './crawl-jobs.controller';
import { CrawlJobsService } from './crawl-jobs.service';
import { CrawlRedisStore } from './crawl-redis.store';
import { CrawlJobEntity } from '../../database/entities/crawl-job.entity';
import { CrawlJobUrlEntity } from '../../database/entities/crawl-job-url.entity';
import { CrawlResultEntity } from '../../database/entities/crawl-result.entity';

@Module({ imports: [TypeOrmModule.forFeature([CrawlJobEntity, CrawlJobUrlEntity, CrawlResultEntity])], controllers: [CrawlJobsController], providers: [CrawlJobsService, CrawlRedisStore], exports: [CrawlJobsService, CrawlRedisStore] })
export class CrawlJobsModule {}
