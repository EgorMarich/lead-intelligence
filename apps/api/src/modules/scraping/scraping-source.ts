import { ScrapeRequest, ScrapedLead } from './scraping.types';

export interface LeadSourceAdapter {
  readonly name: string;
  scrape(
    request: ScrapeRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<ScrapedLead, void, unknown>;
}
