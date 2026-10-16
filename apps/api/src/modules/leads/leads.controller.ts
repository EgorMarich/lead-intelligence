import { organizationIdFromRequest } from '../../common/organization-context';
import { Body, Controller, Get, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { LeadsService, LeadStatus } from './leads.service';
@Controller('leads')
export class LeadsController {
  constructor(private readonly service:LeadsService){}
  private org(req:any){return req.user?.organizationId??req.headers['x-organization-id'];}
  @Get() list(@Req() req:any,@Query() q:any){return this.service.list(this.org(req),q)}
  @Get('export.csv') export(@Req() req:any,@Query('ids') ids:string,@Res() res:Response){res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="leads.csv"');return res.send('\ufeff'+this.service.exportCsv(this.org(req),ids?ids.split(','):undefined));}
  @Get(':id') get(@Req() req:any,@Param('id') id:string){return this.service.get(this.org(req),id)}
  @Post() create(@Req() req:any,@Body() b:any){return this.service.create(this.org(req),b,req.user?.id)}
  @Put(':id') update(@Req() req:any,@Param('id') id:string,@Body() b:any){return this.service.update(this.org(req),id,b,req.user?.id)}
  @Post(':id/notes') note(@Req() req:any,@Param('id') id:string,@Body() b:{text:string}){return this.service.note(this.org(req),id,b.text,req.user?.id)}
  @Post(':id/tags') tag(@Req() req:any,@Param('id') id:string,@Body() b:{tag:string}){return this.service.tag(this.org(req),id,b.tag,req.user?.id)}
  @Post(':id/tags/remove') remove(@Req() req:any,@Param('id') id:string,@Body() b:{tag:string}){return this.service.removeTag(this.org(req),id,b.tag,req.user?.id)}
  @Post('bulk/status') bulk(@Req() req:any,@Body() b:{ids:string[];status:LeadStatus}){return this.service.bulkStatus(this.org(req),b.ids,b.status,req.user?.id)}
}
