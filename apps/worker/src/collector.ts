import { RawBusiness, SearchParams } from '@lead/shared';

export interface BusinessSource {
  readonly name: string;
  search(params: SearchParams): Promise<RawBusiness[]>;
}

export class MockBusinessSource implements BusinessSource {
  readonly name = 'mock';

  async search(params: SearchParams): Promise<RawBusiness[]> {
    const city = params.cityId;
    const category = params.categoryId;
    const query = params.query?.trim().toLowerCase();
    const results = [
      {
        externalId: `mock-${city}-${category}-1`,
        name: 'Old Town Barber',
        city: 'Москва',
        category: 'BARBERSHOP',
        address: 'Тверская улица, 1',
        phone: '+7 (999) 123-45-67',
        email: 'hello@oldtown.example',
        website: 'https://oldtown.example',
        rating: 4.8,
        reviewsCount: 312,
        sourceUrl: 'mock://business/1',
      },
      {
        externalId: `mock-${city}-${category}-2`,
        name: 'City Beauty',
        city: 'Москва',
        category: 'BEAUTY_SALON',
        address: 'Арбат, 10',
        phone: '+7 999 1234568',
        website: 'https://citybeauty.example',
        rating: 4.6,
        reviewsCount: 87,
        sourceUrl: 'mock://business/2',
      },
    ];
    return query ? results.filter(item => [item.name, item.category, item.city].filter(Boolean).some(value => String(value).toLowerCase().includes(query))) : results;
  }
}
