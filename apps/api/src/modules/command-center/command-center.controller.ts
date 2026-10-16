import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { CommandCenterService } from './command-center.service';

@Controller('command-center')
@UseGuards(JwtAuthGuard)
export class CommandCenterController {
  constructor(private readonly service: CommandCenterService, private readonly orgs: CurrentOrganizationService, private readonly auth: AuthorizationService) {}

  @Get('overview')
  async overview(@Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.auth.requirePermission(req.user.sub, organizationId, Permission.BUSINESS_READ);
    return { data: await this.service.overview(organizationId) };
  }
}
