import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { AiReplyCopilotService } from './ai-reply-copilot.service';

@Controller('communications/copilot')
export class AiReplyCopilotController {
  constructor(private readonly service: AiReplyCopilotService) {}
  @Get(':businessId') async latest(@Param('businessId') businessId: string, @Req() req: any) { return { data: await this.service.latest(req.headers['x-organization-id'], businessId) }; }
  @Post(':businessId/suggest') async suggest(@Param('businessId') businessId: string, @Req() req: any) { return { data: await this.service.suggest(req.headers['x-organization-id'], businessId) }; }
  @Post('/:id/use') async use(@Param('id') id: string, @Body() body: { body?: string }, @Req() req: any) { return { data: await this.service.use(req.headers['x-organization-id'], id, body?.body) }; }
  @Post('/:id/dismiss') async dismiss(@Param('id') id: string, @Req() req: any) { return { data: await this.service.dismiss(req.headers['x-organization-id'], id) }; }
}
