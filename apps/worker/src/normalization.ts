export function normalizePhone(value?: string) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return value.trim();
}

export function normalizeUrl(value?: string) {
  if (!value) return undefined;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  url.hash = '';
  url.search = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString();
}

export function normalizeDomain(value?: string) {
  const normalized = normalizeUrl(value);
  return normalized ? new URL(normalized).hostname : undefined;
}

export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
