import { normalizeDomain, normalizeName, normalizePhone } from './normalization';
import { RawBusiness } from '@lead/shared';

export interface ExistingBusiness {
  id: string;
  name: string;
  city: string;
  phone?: string;
  website?: string;
  address?: string;
}

export function matchBusiness(raw: RawBusiness, existing: ExistingBusiness[]) {
  const phone = normalizePhone(raw.phone);
  const domain = normalizeDomain(raw.website);
  const name = normalizeName(raw.name);

  let best: { id: string; confidence: number } | null = null;

  for (const item of existing) {
    const existingPhone = normalizePhone(item.phone);
    const existingDomain = normalizeDomain(item.website);
    const samePhone = phone && existingPhone && phone === existingPhone;
    const sameDomain = domain && existingDomain && domain === existingDomain;
    const sameNameCity =
      normalizeName(item.name) === name &&
      normalizeName(item.city) === normalizeName(raw.city);

    const confidence = samePhone ? 1 : sameDomain ? 0.95 : sameNameCity ? 0.85 : 0;
    if (confidence && (!best || confidence > best.confidence)) {
      best = { id: item.id, confidence };
    }
  }
  return best;
}
