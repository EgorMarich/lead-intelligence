import { Module } from '@nestjs/common';
import { MockSourceAdapter } from './mock-source.adapter';
import { ScraperRegistryService } from './scraper-registry.service';
import { ScrapingPolicyService } from './scraping-policy.service';
import { ScrapingWorkerService } from './scraping-worker.service';

@Module({
  providers: [
    MockSourceAdapter,
    ScraperRegistryService,
    ScrapingPolicyService,
    ScrapingWorkerService,
  ],
  exports: [
    ScraperRegistryService,
    ScrapingPolicyService,
    ScrapingWorkerService,
  ],
})
export class ScrapingModule {}
