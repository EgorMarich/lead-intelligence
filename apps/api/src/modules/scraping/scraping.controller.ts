import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ScraperRegistryService } from './scraper-registry.service';
import { ScrapingWorkerService } from './scraping-worker.service';

@Controller('scraping')
@UseGuards(JwtAuthGuard)
export class ScrapingController {
  constructor(
    private readonly registry: ScraperRegistryService,
    private readonly worker: ScrapingWorkerService,
  ) {}

  @Get('sources')
  sources() {
    return { data: this.registry.list() };
  }

  @Post('jobs/:jobId/cancel')
  cancel(@Req() req: any, @Param('jobId') jobId: string) {
    return {
      data: {
        organizationId:
          req.organizationId ?? req.headers['x-organization-id'],
        jobId,
        cancelled: this.worker.cancel(jobId),
      },
    };
  }
}
