import { RawBusiness, SearchParams } from '@lead/shared';

export interface LeadSource {
  readonly name: string;
  search(params: SearchParams): AsyncGenerator<RawBusiness>;
}
