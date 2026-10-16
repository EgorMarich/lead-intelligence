import dns from 'node:dns/promises';
import net from 'node:net';
import puppeteer, { Browser } from 'puppeteer';

export type CrawledPage = {
  url: string;
  statusCode?: number;
  title?: string;
  description?: string;
  language?: string;
  text?: string;
  emails: string[];
  phones: string[];
  links: string[];
  internalLinks: string[];
  social: Record<'telegram' | 'vk' | 'whatsapp' | 'instagram', string[]>;
  technologies: string[];
  signals: {
    onlineBooking: boolean;
    contactPage: boolean;
    analytics: boolean;
    ecommerce: boolean;
  };
};

export interface CrawlerAdapter {
  crawl(url: string): Promise<CrawledPage>;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TEXT_LENGTH = 100_000;
const USER_AGENT = 'LeadIntelligenceBot/0.16 (+https://lead-intelligence.local/bot)';

/**
 * Real browser adapter. The network target is validated before navigation and
 * every redirect is checked again to reduce SSRF risk.
 */
export class BrowserCrawlerAdapter implements CrawlerAdapter {
  private browser?: Browser;
  private readonly timeoutMs = Number(process.env.REQUEST_TIMEOUT ?? DEFAULT_TIMEOUT_MS);

  async crawl(rawUrl: string): Promise<CrawledPage> {
    const target = await this.validateTarget(rawUrl);
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setUserAgent(USER_AGENT);
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      page.setDefaultNavigationTimeout(this.timeoutMs);
      page.setDefaultTimeout(this.timeoutMs);

      await page.setRequestInterception(true);
      page.on('request', request => {
        const type = request.resourceType();
        if (['image', 'media', 'font'].includes(type)) request.abort().catch(() => undefined);
        else request.continue().catch(() => undefined);
      });

      const response = await page.goto(target.toString(), {
        waitUntil: 'domcontentloaded',
        timeout: this.timeoutMs,
      });

      // The final URL can be different after redirects. Validate it before we
      // trust or persist it.
      const finalUrl = await this.validateTarget(page.url());
      const contentType = response?.headers()['content-type'] ?? '';
      if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        throw new Error('Target is not an HTML document');
      }

      // Give client-rendered pages a short opportunity to populate their DOM.
      await page.waitForNetworkIdle({ idleTime: 500, timeout: Math.min(this.timeoutMs, 5_000) }).catch(() => undefined);

      const data = await page.evaluate((maxText) => {
        const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
        const absolute = (value: string) => {
          try { return new URL(value, location.href).toString(); } catch { return null; }
        };
        const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .map(a => absolute(a.getAttribute('href') ?? ''))
          .filter((x): x is string => !!x && /^https?:\/\//i.test(x));
        const unique = (values: string[]) => [...new Set(values)];
        const bodyText = clean(document.body?.innerText).slice(0, maxText);
        const html = document.documentElement.outerHTML;
        const meta = (name: string) => document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? '';
        const property = (name: string) => document.querySelector<HTMLMetaElement>(`meta[property="${name}"]`)?.content ?? '';
        const social = {
          telegram: links.filter(x => /(?:t\.me|telegram\.me)\//i.test(x)),
          vk: links.filter(x => /vk\.com\//i.test(x)),
          whatsapp: links.filter(x => /(?:wa\.me|api\.whatsapp\.com)\//i.test(x)),
          instagram: links.filter(x => /instagram\.com\//i.test(x)),
        };
        const normalized = `${bodyText}\n${html}`.toLowerCase();
        const technologies = new Set<string>();
        if (/wp-content|wordpress/i.test(html)) technologies.add('WordPress');
        if (/bitrix|1c-bitrix/i.test(html)) technologies.add('1C-Bitrix');
        if (/tilda/i.test(html)) technologies.add('Tilda');
        if (/shopify/i.test(html)) technologies.add('Shopify');
        if (/wix\.com|wixstatic\.com/i.test(html)) technologies.add('Wix');
        if (/yclients/i.test(html)) technologies.add('YCLIENTS');
        if (/dikidi/i.test(html)) technologies.add('DIKIDI');
        if (/mc\.yandex\.ru|yandex metrika/i.test(html)) technologies.add('Yandex Metrica');
        if (/googletagmanager|google-analytics|gtag\(/i.test(html)) technologies.add('Google Analytics');

        const emails = unique((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map(x => x.toLowerCase()));
        const phones = unique((bodyText.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? []).map(x => x.trim()));
        const origin = location.origin;
        const internalLinks = unique(links.filter(x => {
          try { return new URL(x).origin === origin; } catch { return false; }
        }));

        return {
          url: location.href,
          title: clean(document.title),
          description: clean(meta('description') || property('og:description')),
          language: document.documentElement.lang || '',
          text: bodyText,
          emails,
          phones,
          links: unique(links).slice(0, 200),
          internalLinks: internalLinks.slice(0, 50),
          social,
          technologies: [...technologies],
          signals: {
            onlineBooking: /(онлайн[- ]?запис|записаться|appointment|booking|yclients|dikidi)/i.test(normalized),
            contactPage: /(\/contacts?\/?|контакты|как нас найти|contact us)/i.test(normalized),
            analytics: technologies.has('Yandex Metrica') || technologies.has('Google Analytics'),
            ecommerce: /(корзина|checkout|add-to-cart|купить|оплата|woocommerce|shopify)/i.test(normalized),
          },
        };
      }, MAX_TEXT_LENGTH);

      return {
        ...data,
        statusCode: response?.status(),
        url: finalUrl.toString(),
      };
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close().catch(() => undefined);
    this.browser = undefined;
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) return this.browser;
    this.browser = await puppeteer.launch({
      headless: true,
      args: (process.env.BROWSER_NO_SANDBOX ?? 'false') === 'true'
        ? ['--no-sandbox', '--disable-setuid-sandbox']
        : [],
    });
    return this.browser;
  }

  private async validateTarget(raw: string): Promise<URL> {
    let url: URL;
    try { url = new URL(raw); } catch { throw new Error('Invalid URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Only public HTTP(S) URLs are allowed');
    }
    if (url.port && !['80', '443'].includes(url.port)) {
      throw new Error('Non-standard target ports are not allowed');
    }
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
      throw new Error('Local targets are not allowed');
    }
    const addresses = await dns.lookup(host, { all: true });
    if (!addresses.length || addresses.some(a => this.isPrivate(a.address))) {
      throw new Error('Private network targets are not allowed');
    }
    url.hash = '';
    return url;
  }

  private isPrivate(address: string): boolean {
    const normalized = address.toLowerCase().split('%')[0];
    if (net.isIPv4(normalized)) {
      const [a, b] = normalized.split('.').map(Number);
      return a === 10 || a === 127 || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0;
    }
    if (!net.isIPv6(normalized)) return true;
    return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || normalized.startsWith('fe80:');
  }
}
