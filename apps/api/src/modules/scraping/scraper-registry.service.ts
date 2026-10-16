import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadSourceAdapter } from './scraping-source';

@Injectable()
export class ScraperRegistryService {
  private readonly adapters = new Map<string, LeadSourceAdapter>();

  register(adapter: LeadSourceAdapter) {
    this.adapters.set(adapter.name, adapter);
  }

  get(source: string) {
    const adapter = this.adapters.get(source);
    if (!adapter) {
      throw new NotFoundException(
        `Scraper source is not configured: ${source}`,
      );
    }
    return adapter;
  }

  list() {
    return [...this.adapters.keys()];
  }
}
