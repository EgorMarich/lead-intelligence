import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { EnrichmentService } from './enrichment.service';

@Controller('enrichment')
@UseGuards(JwtAuthGuard)
export class EnrichmentController {
  constructor(private readonly service: EnrichmentService, private readonly orgs: CurrentOrganizationService, private readonly authorization: AuthorizationService) {}

  @Post(':businessId')
  async enqueue(@Param('businessId') businessId: string, @Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.BUSINESS_WRITE);
    return { data: await this.service.enqueue(organizationId, businessId) };
  }

  @Get(':businessId')
  async get(@Param('businessId') businessId: string, @Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.SEARCH_READ);
    return { data: await this.service.get(organizationId, businessId) };
  }
}
