import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { RevenueService } from './revenue.service';

@Controller('revenue') @UseGuards(JwtAuthGuard)
export class RevenueController {
  constructor(private readonly revenue:RevenueService, private readonly orgs:CurrentOrganizationService, private readonly authorization:AuthorizationService) {}
  @Get('overview') async overview(@Req() req:any,@Query('months') months='12') {
    const organizationId=await this.orgs.getForUser(req.user.sub,req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub,organizationId,Permission.ANALYTICS_READ);
    return {data:await this.revenue.overview(organizationId,Math.min(24,Math.max(3,Number(months)||12)))};
  }
}
