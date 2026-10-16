import { Injectable } from '@nestjs/common';
import { LeadSourceAdapter } from './scraping-source';
import { ScrapeRequest, ScrapedLead } from './scraping.types';

@Injectable()
export class MockSourceAdapter implements LeadSourceAdapter {
  readonly name = 'mock';

  async *scrape(request: ScrapeRequest): AsyncGenerator<ScrapedLead> {
    const count = Math.min(request.limit, 25);

    for (let i = 1; i <= count; i++) {
      yield {
        externalId: `${request.source}-${request.searchJobId}-${i}`,
        name: `${request.query} Company ${i}`,
        category: request.category,
        city: request.city,
        address: request.city
          ? `${request.city}, Demo street ${i}`
          : undefined,
        phone: `+7 900 000-${String(i).padStart(4, '0')}`,
        website: `https://example.com/business/${i}`,
        source: request.source,
        raw: {
          query: request.query,
          city: request.city,
          category: request.category,
          demo: true,
        },
      };
    }
  }
}
