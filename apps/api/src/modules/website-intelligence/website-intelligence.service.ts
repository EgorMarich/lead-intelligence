import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import dns from 'node:dns/promises';
import net from 'node:net';
import { randomUUID } from 'node:crypto';

type Input = { organizationId: string; url: string; maxPages?: number };
type Result = {
  id: string; organizationId: string; requestedUrl: string; finalUrl: string;
  analyzedAt: string; status: 'COMPLETED' | 'FAILED'; pages: number;
  httpStatus?: number; title?: string; description?: string; language?: string; ssl: boolean;
  technologies: string[]; contacts: { emails: string[]; phones: string[]; social: Record<string, string[]> };
  signals: { onlineBooking: boolean; contactPage: boolean; analytics: boolean; ecommerce: boolean };
  links: string[]; error?: string;
};

const MAX_BYTES = 1_500_000;
const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_MAX_PAGES = 3;
const MAX_MAX_PAGES = 5;
const USER_AGENT = 'LeadIntelligenceBot/0.9';

@Injectable()
export class WebsiteIntelligenceService {
  private readonly results = new Map<string, Result>();

  async analyze(input: Input) {
    const start = await this.validateTarget(input.url);
    const maxPages = Math.min(Math.max(Number(input.maxPages ?? DEFAULT_MAX_PAGES), 1), MAX_MAX_PAGES);
    const id = randomUUID();
    const visited = new Set<string>();
    const queue = [start.toString()];
    const agg = {
      title: '', description: '', language: '', status: 200, finalUrl: start.toString(), ssl: start.protocol === 'https:',
      technologies: new Set<string>(), emails: new Set<string>(), phones: new Set<string>(), links: new Set<string>(),
      social: { telegram: new Set<string>(), vk: new Set<string>(), whatsapp: new Set<string>(), instagram: new Set<string>() },
      booking: false, contact: false, analytics: false, ecommerce: false,
    };

    try {
      while (queue.length && visited.size < maxPages) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        const page = await this.fetchHtml(await this.validateTarget(current));
        agg.status = page.status; agg.finalUrl = page.url; agg.ssl &&= page.url.startsWith('https://');
        const parsed = this.parse(page.html, page.url);
        if (!agg.title) agg.title = parsed.title;
        if (!agg.description) agg.description = parsed.description;
        if (!agg.language) agg.language = parsed.language;
        parsed.technologies.forEach(x => agg.technologies.add(x));
        parsed.emails.forEach(x => agg.emails.add(x)); parsed.phones.forEach(x => agg.phones.add(x));
        parsed.links.forEach(x => agg.links.add(x));
        Object.entries(parsed.social).forEach(([k, values]) => values.forEach(x => agg.social[k as keyof typeof agg.social].add(x)));
        agg.booking ||= parsed.signals.onlineBooking; agg.contact ||= parsed.signals.contactPage;
        agg.analytics ||= parsed.signals.analytics; agg.ecommerce ||= parsed.signals.ecommerce;
        parsed.internalLinks.forEach(link => { if (visited.size + queue.length < maxPages && !visited.has(link)) queue.push(link); });
      }

      const result: Result = {
        id, organizationId: input.organizationId, requestedUrl: input.url, finalUrl: agg.finalUrl,
        analyzedAt: new Date().toISOString(), status: 'COMPLETED', pages: visited.size, httpStatus: agg.status,
        title: agg.title || undefined, description: agg.description || undefined, language: agg.language || undefined, ssl: agg.ssl,
        technologies: [...agg.technologies],
        contacts: { emails: [...agg.emails].slice(0, 20), phones: [...agg.phones].slice(0, 20), social: Object.fromEntries(Object.entries(agg.social).map(([k,v]) => [k,[...v].slice(0,20)])) },
        signals: { onlineBooking: agg.booking, contactPage: agg.contact, analytics: agg.analytics, ecommerce: agg.ecommerce },
        links: [...agg.links].slice(0, 100),
      };
      this.results.set(id, result); return result;
    } catch (e: any) {
      const result: Result = { id, organizationId: input.organizationId, requestedUrl: input.url, finalUrl: start.toString(), analyzedAt: new Date().toISOString(), status: 'FAILED', pages: visited.size, ssl: start.protocol === 'https:', technologies: [], contacts: { emails: [], phones: [], social: { telegram: [], vk: [], whatsapp: [], instagram: [] } }, signals: { onlineBooking: false, contactPage: false, analytics: false, ecommerce: false }, links: [], error: e?.message ?? 'Website analysis failed' };
      this.results.set(id, result); return result;
    }
  }

  async inspect(rawUrl: string) {
    const url = await this.validateTarget(rawUrl); const page = await this.fetchHtml(url);
    return { ok: true, url: page.url, status: page.status, contentType: page.contentType, bytes: Buffer.byteLength(page.html) };
  }

  getResult(organizationId: string, id: string) {
    const result = this.results.get(id);
    if (!result || result.organizationId !== organizationId) throw new NotFoundException('Website analysis not found');
    return result;
  }

  private async validateTarget(raw: string) {
    let url: URL;
    try { url = new URL(raw); } catch { throw new BadRequestException('Invalid URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new BadRequestException('Only public HTTP(S) URLs are allowed');
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost')) throw new BadRequestException('Local targets are not allowed');
    const addresses = await dns.lookup(host, { all: true });
    if (addresses.some(a => this.isPrivate(a.address))) throw new BadRequestException('Private network targets are not allowed');
    url.hash = ''; return url;
  }

  private isPrivate(address: string) {
    const a = address.toLowerCase();
    if (net.isIPv4(a)) { const [x,y] = a.split('.').map(Number); return x === 10 || x === 127 || (x === 169 && y === 254) || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168); }
    return net.isIPv6(a) && (a === '::1' || a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80:'));
  }

  private async fetchHtml(url: URL) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' } });
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location'); if (!location) throw new Error('Redirect without location');
        return this.fetchHtml(await this.validateTarget(new URL(location, url).toString()));
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error('Target is not an HTML document');
      const bytes = Buffer.from(await response.arrayBuffer()); if (bytes.byteLength > MAX_BYTES) throw new Error('HTML document is too large');
      return { status: response.status, url: response.url || url.toString(), contentType, html: bytes.toString('utf8') };
    } finally { clearTimeout(timer); }
  }

  private parse(html: string, pageUrl: string) {
    const title = this.match(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const description = this.match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    const language = this.match(html, /<html[^>]+lang=["']([^"']+)["']/i);
    const emails = [...html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(m => m[0].toLowerCase());
    const phones = [...html.matchAll(/(?:\+?\d[\d\s().-]{7,}\d)/g)].map(m => m[0].trim());
    const hrefs = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map(m => m[1]);
    const links = [...new Set(hrefs.map(x => { try { return new URL(x, pageUrl).toString(); } catch { return null; } }).filter((x): x is string => !!x && /^https?:\/\//i.test(x)))];
    const origin = new URL(pageUrl).origin;
    const internalLinks = links.filter(x => { try { return new URL(x).origin === origin; } catch { return false; } }).slice(0, 20);
    const technologies = new Set<string>();
    if (/wp-content|wordpress/i.test(html)) technologies.add('WordPress'); if (/bitrix|1c-bitrix/i.test(html)) technologies.add('1C-Bitrix'); if (/tilda/i.test(html)) technologies.add('Tilda'); if (/shopify/i.test(html)) technologies.add('Shopify'); if (/wix\.com/i.test(html)) technologies.add('Wix'); if (/yandex metrika|mc\.yandex\.ru/i.test(html)) technologies.add('Yandex Metrica'); if (/googletagmanager|google-analytics|gtag\(/i.test(html)) technologies.add('Google Analytics');
    const normalized = html.toLowerCase();
    return {
      title: this.decode(title), description: this.decode(description), language, emails: [...new Set(emails)], phones: [...new Set(phones)],
      links, internalLinks, technologies: [...technologies],
      social: { telegram: links.filter(x => /t\.me\//i.test(x)), vk: links.filter(x => /vk\.com\//i.test(x)), whatsapp: links.filter(x => /wa\.me\//i.test(x)), instagram: links.filter(x => /instagram\.com\//i.test(x)) },
      signals: { onlineBooking: /(онлайн[- ]?запис|записаться|appointment|booking|yclients|dikidi)/i.test(normalized), contactPage: /(\/contacts?\/|контакты|как нас найти)/i.test(normalized), analytics: technologies.has('Yandex Metrica') || technologies.has('Google Analytics'), ecommerce: /(корзина|checkout|add-to-cart|купить|оплата|woocommerce)/i.test(normalized) },
    };
  }
  private match(value: string, regex: RegExp) { return value.match(regex)?.[1]?.trim() ?? ''; }
  private decode(value: string) { return value.replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g,' ').trim(); }
}
