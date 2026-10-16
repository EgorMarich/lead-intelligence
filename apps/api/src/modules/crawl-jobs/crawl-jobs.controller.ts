import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { CrawlJobsService } from './crawl-jobs.service';

@Controller('crawl-jobs')
export class CrawlJobsController {
  constructor(private readonly service: CrawlJobsService) {}

  @Post()
  create(
    @Req() req: any,
    @Body() body: { urls: string[]; maxPagesPerSite?: number; priority?: number },
  ) {
    const organizationId = req.user?.organizationId ?? req.headers['x-organization-id'];
    if (!organizationId) throw new BadRequestException('Organization is required');

    return this.service.create({
      organizationId,
      urls: body.urls,
      maxPagesPerSite: body.maxPagesPerSite,
      priority: body.priority,
    });
  }

  @Get()
  list(@Req() req: any) {
    const organizationId = req.user?.organizationId ?? req.headers['x-organization-id'];
    return this.service.list(organizationId);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.user?.organizationId ?? req.headers['x-organization-id'];
    return this.service.get(organizationId, id);
  }

  @Get(':id/results')
  results(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.user?.organizationId ?? req.headers['x-organization-id'];
    return this.service.getResults(organizationId, id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.user?.organizationId ?? req.headers['x-organization-id'];
    return this.service.cancel(organizationId, id);
  }
}
