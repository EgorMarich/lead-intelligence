import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly orgs: CurrentOrganizationService,
    private readonly authorization: AuthorizationService,
  ) {}

  @Get('overview')
  async overview(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.ANALYTICS_READ);
    return { data: await this.analytics.overview(organizationId, from, to) };
  }

  @Get('breakdown')
  async breakdown(
    @Req() req: any,
    @Query('dimension') dimension = 'channel',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.ANALYTICS_READ);
    return { data: await this.analytics.breakdown(organizationId, dimension, from, to) };
  }
}
