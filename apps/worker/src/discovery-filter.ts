import { DiscoveryCondition, DiscoveryFilterGroup, DiscoveryFilters, DiscoveryOperator } from '@lead/shared';
import { RawBusiness } from '@lead/shared';

type Candidate = RawBusiness & { employeeCount?: number; rawPayload?: Record<string, unknown>; score?: number; grade?: string };

function bool(payload: Record<string, unknown>, ...keys: string[]) {
  return keys.some(k => payload[k] === true || payload[k] === 'true' || typeof payload[k] === 'string' && String(payload[k]).length > 0);
}

function value(candidate: Candidate, field: DiscoveryCondition['field']): unknown {
  const payload = candidate.rawPayload ?? {};
  switch (field) {
    case 'city': return candidate.city;
    case 'category': return candidate.category;
    case 'hasWebsite': return Boolean(candidate.website);
    case 'hasPhone': return Boolean(candidate.phone);
    case 'hasEmail': return Boolean(candidate.email);
    case 'hasTelegram': return bool(payload, 'telegram', 'hasTelegram');
    case 'hasVk': return bool(payload, 'vk', 'hasVk');
    case 'hasWhatsapp': return bool(payload, 'whatsapp', 'hasWhatsapp');
    case 'hasInstagram': return bool(payload, 'instagram', 'hasInstagram');
    case 'onlineBooking': return bool(payload, 'onlineBooking', 'hasOnlineBooking', 'bookingUrl');
    case 'technology': return Array.isArray(payload.technologies) ? payload.technologies : (payload.technology ?? '');
    case 'rating': return candidate.rating ?? 0;
    case 'reviewsCount': return candidate.reviewsCount ?? 0;
    case 'employeeCount': return candidate.employeeCount ?? payload.employeeCount ?? 0;
    case 'score': return candidate.score ?? 0;
    case 'grade': return candidate.grade ?? '';
  }
}

function compare(actual: unknown, operator: DiscoveryOperator, expected: unknown): boolean {
  if (operator === 'isTrue') return actual === true;
  if (operator === 'isFalse') return actual === false;
  if (operator === 'contains') {
    if (Array.isArray(actual)) return actual.some(x => String(x).toLowerCase().includes(String(expected).toLowerCase()));
    return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
  }
  if (operator === 'in') return Array.isArray(expected) && expected.map(String).includes(String(actual));
  if (operator === 'eq') return Array.isArray(actual) ? actual.map(String).includes(String(expected)) : actual == expected;
  if (operator === 'neq') return !compare(actual, 'eq', expected);
  if (operator === 'gte') return Number(actual) >= Number(expected);
  if (operator === 'lte') return Number(actual) <= Number(expected);
  return false;
}

function groupMatches(candidate: Candidate, group: DiscoveryFilterGroup): boolean {
  const conditions = group.conditions.map(c => compare(value(candidate, c.field), c.operator, c.value));
  const nested = (group.groups ?? []).map(g => groupMatches(candidate, g));
  const values = [...conditions, ...nested];
  if (!values.length) return true;
  return group.logic === 'OR' ? values.some(Boolean) : values.every(Boolean);
}

export function matchesDiscoveryFilters(candidate: Candidate, filters?: DiscoveryFilters | Record<string, unknown>): boolean {
  if (!filters || !('root' in filters)) return true;
  return groupMatches(candidate, filters.root);
}
