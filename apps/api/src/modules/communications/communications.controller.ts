import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { CommunicationsService } from './communications.service';

@Controller('communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Get('threads/:businessId')
  async threads(@Param('businessId') businessId: string, @Req() req: any) { return { data: await this.service.listThreads(req.headers['x-organization-id'], businessId) }; }

  @Get('messages/:businessId')
  async messages(@Param('businessId') businessId: string, @Req() req: any) { return { data: await this.service.listMessages(req.headers['x-organization-id'], businessId) }; }

  @Post('webhooks/telegram/:secret')
  async telegram(@Param('secret') secret: string, @Body() body: any) { return this.service.handleTelegramWebhook(secret, body); }

  @Get('webhooks/whatsapp')
  async whatsappVerify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) { return this.service.verifyWhatsApp(mode, token, challenge); }

  @Post('webhooks/whatsapp')
  async whatsapp(@Body() body: any) { return this.service.handleWhatsAppWebhook(body); }

  @Post('webhooks/vk/:secret')
  async vk(@Param('secret') secret: string, @Body() body: any) { return this.service.handleVkWebhook(secret, body); }
}
