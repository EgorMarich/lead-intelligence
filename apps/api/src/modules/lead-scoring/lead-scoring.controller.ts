import { organizationIdFromRequest } from '../../common/organization-context';
import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { LeadScoringService } from './lead-scoring.service';

@Controller('lead-scoring')
export class LeadScoringController {
  constructor(private readonly service: LeadScoringService) {}

  @Get('profiles')
  profiles(@Req() req: any) {
    return this.service.listProfiles(organizationIdFromRequest(req));
  }

  @Get('profiles/:id')
  profile(@Req() req: any, @Param('id') id: string) {
    return this.service.getProfile(organizationIdFromRequest(req), id);
  }

  @Post('profiles')
  create(@Req() req: any, @Body() body: any) {
    return this.service.createProfile(organizationIdFromRequest(req), body);
  }

  @Put('profiles/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.updateProfile(organizationIdFromRequest(req), id, body);
  }

  @Post('profiles/:id/score')
  score(@Req() req: any, @Param('id') id: string, @Body() signals: any) {
    return this.service.score(organizationIdFromRequest(req), id, signals);
  }
}
