import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { OutreachService } from './outreach.service';
import { CreateOutreachDto, CreateTemplateDto } from './outreach.dto';

@Controller('outreach')
@UseGuards(JwtAuthGuard)
export class OutreachController {
  constructor(private readonly service: OutreachService, private readonly orgs: CurrentOrganizationService, private readonly auth: AuthorizationService) {}
  private async org(req: any) { return this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']); }
  @Get('messages') async list(@Req() req: any) { const org = await this.org(req); await this.auth.requirePermission(req.user.sub, org, Permission.BUSINESS_READ); return { data: await this.service.list(org) }; }
  @Get('messages/:businessId') async listBusiness(@Param('businessId') id: string, @Req() req: any) { const org = await this.org(req); await this.auth.requirePermission(req.user.sub, org, Permission.BUSINESS_READ); return { data: await this.service.list(org, id) }; }
  @Get('preview/:businessId/:channel') async preview(@Param('businessId') id: string, @Param('channel') channel: any, @Req() req: any) { const org = await this.org(req); await this.auth.requirePermission(req.user.sub, org, Permission.BUSINESS_READ); return { data: await this.service.preview(org, id, channel) }; }
  @Post('messages/:businessId') async create(@Param('businessId') id: string, @Body() dto: CreateOutreachDto, @Req() req: any) { const org = await this.org(req); await this.auth.requirePermission(req.user.sub, org, Permission.BUSINESS_WRITE); return { data: await this.service.create(org, id, dto) }; }
  @Post('messages/:id/send') async send(@Param('id') id: string, @Req() req: any) { const org = await this.org(req); await this.auth.requirePermission(req.user.sub, org, Permission.BUSINESS_WRITE); return { data: await this.service.send(org, id) }; }
  @Get('templates') async templates(@Req() req: any) { const org = await this.org(req); await this.auth.requirePermission(req.user.sub, org, Permission.BUSINESS_READ); return { data: await this.service.templatesList(org) }; }
  @Post('templates') async createTemplate(@Body() dto: CreateTemplateDto, @Req() req: any) { const org = await this.org(req); await this.auth.requirePermission(req.user.sub, org, Permission.BUSINESS_WRITE); return { data: await this.service.createTemplate(org, dto) }; }
}
