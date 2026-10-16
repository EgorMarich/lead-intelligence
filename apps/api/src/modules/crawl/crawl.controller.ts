import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { organizationIdFromRequest } from '../../common/organization-context';
import { CrawlQueue } from './crawl.queue'; import { CrawlWorker } from './crawl.worker';
@Controller('crawl') export class CrawlController { constructor(private q:CrawlQueue,private w:CrawlWorker){}
@Post('jobs') create(@Req() req:any,@Body() body:{urls:string[]}){if(!Array.isArray(body.urls)||!body.urls.length)throw new Error('urls must contain at least one URL');return this.q.enqueue(organizationIdFromRequest(req),body.urls);}
@Get('jobs') list(@Req() req:any){return this.q.list(organizationIdFromRequest(req));}
@Get('jobs/:id') get(@Req() req:any,@Param('id') id:string){return this.q.get(organizationIdFromRequest(req),id);}
@Post('jobs/:id/run') async run(@Req() req:any,@Param('id') id:string){const org=organizationIdFromRequest(req);if(!this.q.get(org,id))return {ok:false,error:'Job not found'};await this.w.process(org,id);return this.q.get(org,id);}}
