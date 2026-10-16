import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CrawlJob } from './crawl.types';
@Injectable()
export class CrawlQueue {
  private jobs = new Map<string,CrawlJob>(); private urls = new Map<string,string[]>();
  enqueue(organizationId:string, urls:string[]) { const id=randomUUID(); const job:CrawlJob={id,organizationId,status:'QUEUED',totalUrls:urls.length,processedUrls:0,failedUrls:0,createdAt:new Date().toISOString()}; this.jobs.set(id,job); this.urls.set(id,[...new Set(urls)]); return job; }
  get(org:string,id:string){const j=this.jobs.get(id); return j?.organizationId===org?j:null;}
  list(org:string){return [...this.jobs.values()].filter(j=>j.organizationId===org).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
  getUrls(org:string,id:string){return this.get(org,id)?this.urls.get(id)??[]:null;}
  update(org:string,id:string,patch:Partial<CrawlJob>){const j=this.get(org,id); if(!j)return null; const u={...j,...patch}; this.jobs.set(id,u); return u;}
}
