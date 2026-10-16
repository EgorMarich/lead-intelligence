import { Injectable, Logger } from '@nestjs/common';
import { ScraperRegistryService } from './scraper-registry.service';
import { ScrapingPolicyService } from './scraping-policy.service';
import { ScrapeRequest, ScrapedLead } from './scraping.types';

@Injectable()
export class ScrapingWorkerService {
  private readonly logger = new Logger(ScrapingWorkerService.name);
  private readonly running = new Map<string, AbortController>();

  constructor(
    private readonly registry: ScraperRegistryService,
    private readonly policy: ScrapingPolicyService,
  ) {}

  async run(
    request: ScrapeRequest,
    onLead: (lead: ScrapedLead) => Promise<void>,
    onProgress: (processed: number) => Promise<void>,
  ) {
    if (this.running.has(request.searchJobId)) {
      throw new Error('Search job is already running');
    }

    const controller = new AbortController();
    this.running.set(request.searchJobId, controller);

    let processed = 0;

    try {
      const adapter = this.registry.get(request.source);

      for await (const lead of adapter.scrape(request, controller.signal)) {
        if (controller.signal.aborted) {
          throw new Error('Search job cancelled');
        }

        await this.policy.wait(
          `${request.organizationId}:${request.source}`,
        );

        await this.policy.withRetry(() => onLead(lead));
        processed++;

        if (processed % 5 === 0 || processed >= request.limit) {
          await onProgress(processed);
        }

        if (processed >= request.limit) break;
      }

      await onProgress(processed);
      return { processed };
    } finally {
      this.running.delete(request.searchJobId);
    }
  }

  cancel(searchJobId: string) {
    const controller = this.running.get(searchJobId);
    if (!controller) return false;

    controller.abort();
    this.logger.log(`Cancelled scraping job ${searchJobId}`);
    return true;
  }

  isRunning(searchJobId: string) {
    return this.running.has(searchJobId);
  }
}
