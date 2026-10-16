import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { WebsiteIntelligenceService } from './website-intelligence.service';

@Controller('website-intelligence')
export class WebsiteIntelligenceController {
  constructor(private readonly service: WebsiteIntelligenceService) {}

  @Post('analyze')
  analyze(@Req() req: any, @Body() body: { url: string; maxPages?: number }) {
    const organizationId = req.user?.organizationId ?? req.headers['x-organization-id'];
    if (!organizationId) throw new BadRequestException('Organization is required');
    return this.service.analyze({ organizationId, url: body.url, maxPages: body.maxPages });
  }

  @Get('health')
  health(@Query('url') url?: string) {
    return url ? this.service.inspect(url) : { ok: true, service: 'website-intelligence' };
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.user?.organizationId ?? req.headers['x-organization-id'];
    return this.service.getResult(organizationId, id);
  }
}
