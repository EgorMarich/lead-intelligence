import dns from 'node:dns/promises';
import net from 'node:net';
import puppeteer, { Browser } from 'puppeteer';

export type CrawledPage = {
  url: string; statusCode?: number; title?: string; description?: string; language?: string; text?: string;
  emails: string[]; phones: string[]; links: string[]; internalLinks: string[];
  social: Record<'telegram'|'vk'|'whatsapp'|'instagram', string[]>; technologies: string[];
  signals: { onlineBooking: boolean; contactPage: boolean; analytics: boolean; ecommerce: boolean };
};

export class BrowserCrawlerAdapter {
  private browser?: Browser;
  private readonly timeoutMs = Number(process.env.REQUEST_TIMEOUT ?? 30000);

  async crawl(rawUrl: string): Promise<CrawledPage> {
    const target = await this.validateTarget(rawUrl);
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1440, height: 900 });
      page.setDefaultNavigationTimeout(this.timeoutMs); page.setDefaultTimeout(this.timeoutMs);
      await page.setRequestInterception(true);
      page.on('request', req => ['image','media','font'].includes(req.resourceType()) ? req.abort().catch(()=>{}) : req.continue().catch(()=>{}));
      const response = await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: this.timeoutMs });
      const finalUrl = await this.validateTarget(page.url());
      const contentType = response?.headers()['content-type'] ?? '';
      if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error('Target is not an HTML document');
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(()=>{});
      const data = await page.evaluate(() => {
        const clean=(v:string|null|undefined)=>(v??'').replace(/\s+/g,' ').trim();
        const absolute=(v:string)=>{try{return new URL(v,location.href).toString()}catch{return null}};
        const links=[...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map(a=>absolute(a.getAttribute('href')??'')).filter((x):x is string=>!!x&&/^https?:\/\//i.test(x));
        const unique=(v:string[])=>[...new Set(v)]; const text=clean(document.body?.innerText).slice(0,100000); const html=document.documentElement.outerHTML;
        const meta=(n:string)=>document.querySelector<HTMLMetaElement>(`meta[name="${n}"]`)?.content??''; const prop=(n:string)=>document.querySelector<HTMLMetaElement>(`meta[property="${n}"]`)?.content??'';
        const social={telegram:links.filter(x=>/(?:t\.me|telegram\.me)\//i.test(x)),vk:links.filter(x=>/vk\.com\//i.test(x)),whatsapp:links.filter(x=>/(?:wa\.me|api\.whatsapp\.com)\//i.test(x)),instagram:links.filter(x=>/instagram\.com\//i.test(x))};
        const technologies=new Set<string>(); if(/wp-content|wordpress/i.test(html))technologies.add('WordPress'); if(/bitrix|1c-bitrix/i.test(html))technologies.add('1C-Bitrix'); if(/tilda/i.test(html))technologies.add('Tilda'); if(/shopify/i.test(html))technologies.add('Shopify'); if(/wix\.com|wixstatic\.com/i.test(html))technologies.add('Wix'); if(/yclients/i.test(html))technologies.add('YCLIENTS'); if(/dikidi/i.test(html))technologies.add('DIKIDI'); if(/mc\.yandex\.ru|yandex metrika/i.test(html))technologies.add('Yandex Metrica'); if(/googletagmanager|google-analytics|gtag\(/i.test(html))technologies.add('Google Analytics');
        return {url:location.href,title:clean(document.title),description:clean(meta('description')||prop('og:description')),language:document.documentElement.lang||'',text,emails:unique((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)??[]).map(x=>x.toLowerCase())),phones:unique((text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g)??[]).map(x=>x.trim())),links:unique(links).slice(0,200),internalLinks:unique(links.filter(x=>{try{return new URL(x).origin===location.origin}catch{return false}})).slice(0,50),social,technologies:[...technologies],signals:{onlineBooking:/(онлайн[- ]?запис|записаться|appointment|booking|yclients|dikidi)/i.test((text+'\n'+html).toLowerCase()),contactPage:/(\/contacts?\/?|контакты|как нас найти|contact us)/i.test(text+'\n'+html),analytics:technologies.has('Yandex Metrica')||technologies.has('Google Analytics'),ecommerce:/(корзина|checkout|add-to-cart|купить|оплата|woocommerce|shopify)/i.test(text+'\n'+html)}};
      });
      return {...data,statusCode:response?.status(),url:finalUrl.toString()};
    } finally { await page.close().catch(()=>{}); }
  }

  async close(){if(this.browser)await this.browser.close().catch(()=>{});this.browser=undefined;}
  private async getBrowser(){if(this.browser)return this.browser;this.browser=await puppeteer.launch({headless:true,args:process.env.BROWSER_NO_SANDBOX==='true'?['--no-sandbox','--disable-setuid-sandbox']:[]});return this.browser;}
  private async validateTarget(raw:string){let url:URL;try{url=new URL(raw)}catch{throw new Error('Invalid URL')};if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Only public HTTP(S) URLs are allowed');if(url.port&&!['80','443'].includes(url.port))throw new Error('Non-standard target ports are not allowed');const host=url.hostname.toLowerCase();if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local'))throw new Error('Local targets are not allowed');const addresses=await dns.lookup(host,{all:true});if(!addresses.length||addresses.some(a=>this.isPrivate(a.address)))throw new Error('Private network targets are not allowed');url.hash='';return url;}
  private isPrivate(address:string){const n=address.toLowerCase().split('%')[0];if(net.isIPv4(n)){const[a,b]=n.split('.').map(Number);return a===10||a===127||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||a===0;}if(!net.isIPv6(n))return true;return n==='::1'||n==='::'||n.startsWith('fc')||n.startsWith('fd')||n.startsWith('fe80:');}
}
