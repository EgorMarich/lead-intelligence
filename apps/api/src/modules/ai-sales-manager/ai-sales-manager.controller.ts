import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { AiSalesManagerService } from './ai-sales-manager.service';

@Controller('ai-sales-manager')
@UseGuards(JwtAuthGuard)
export class AiSalesManagerController {
  constructor(private readonly service: AiSalesManagerService, private readonly orgs: CurrentOrganizationService, private readonly auth: AuthorizationService) {}

  @Get('briefing')
  async briefing(@Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.auth.requirePermission(req.user.sub, organizationId, Permission.BUSINESS_READ);
    return { data: await this.service.briefing(organizationId) };
  }
}
