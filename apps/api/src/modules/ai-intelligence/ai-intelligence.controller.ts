import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { AiIntelligenceService } from './ai-intelligence.service';

@Controller('ai-intelligence')
@UseGuards(JwtAuthGuard)
export class AiIntelligenceController {
  constructor(private readonly service: AiIntelligenceService, private readonly orgs: CurrentOrganizationService, private readonly auth: AuthorizationService) {}
  private async org(req: any) { return this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']); }

  @Get(':businessId')
  async get(@Param('businessId') businessId: string, @Req() req: any) {
    const org = await this.org(req);
    await this.auth.requirePermission(req.user.sub, org, Permission.BUSINESS_READ);
    return { data: await this.service.get(org, businessId) };
  }

  @Post(':businessId/analyze')
  async analyze(@Param('businessId') businessId: string, @Req() req: any) {
    const org = await this.org(req);
    await this.auth.requirePermission(req.user.sub, org, Permission.BUSINESS_WRITE);
    return { data: await this.service.analyze(org, businessId) };
  }
}
