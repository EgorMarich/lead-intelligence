import { RawBusiness, SearchParams } from '@lead/shared';
import { LeadSource } from './source';

export class MockSource implements LeadSource {
  readonly name = 'mock';
  async *search(params: SearchParams): AsyncGenerator<RawBusiness> {
    const limit = Math.min(params.limit ?? 25, 1000);
    for (let i = 1; i <= limit; i++) {
      yield {
        externalId: `mock-${params.cityId}-${params.categoryId}-${i}`,
        name: `Demo Business ${i}`,
        city: params.cityId,
        category: params.categoryId,
        address: `Demo street ${i}`,
        phone: `+7999000${String(i).padStart(4, '0')}`,
        website: `https://example.com/business/${i}`,
        rating: 4 + ((i % 10) / 10),
        reviewsCount: i * 3,
        sourceUrl: `https://example.com/business/${i}`,
      };
    }
  }
}
