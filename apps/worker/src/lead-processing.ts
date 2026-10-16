import { RawBusiness } from '@lead/shared';

export function normalizeLead(input: RawBusiness): RawBusiness {
  return {
    ...input,
    name: input.name.trim().replace(/\s+/g, ' '),
    phone: input.phone?.replace(/[^0-9+]/g, '') || undefined,
    website: input.website?.trim().replace(/\/$/, '') || undefined,
    email: input.email?.trim().toLowerCase() || undefined,
  };
}

export function leadFingerprint(input: RawBusiness): string {
  const name = input.name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '');
  const city = (input.city ?? '').toLowerCase().replace(/\s+/g, '');
  const phone = (input.phone ?? '').replace(/\D/g, '');
  return [input.externalId ?? '', name, city, phone].join('|');
}
