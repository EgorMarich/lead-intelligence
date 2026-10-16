import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './billing.dto';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  plans() { return this.billing.listPlans(); }

  @Post('webhooks/yookassa')
  webhook(@Body() payload: any) { return this.billing.handleWebhook(payload); }

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  current(@Req() req: any, @Headers('x-organization-id') org?: string) {
    return this.billing.current(req.user.sub, org);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  history(@Req() req: any, @Headers('x-organization-id') org?: string) {
    return this.billing.history(req.user.sub, org);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  checkout(@Req() req: any, @Headers('x-organization-id') org: string | undefined, @Headers('idempotency-key') idempotencyKey: string | undefined, @Body() dto: CreateCheckoutDto) {
    return this.billing.checkout(req.user.sub, dto.planCode, dto.returnUrl, org, idempotencyKey ?? '');
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancel(@Req() req: any, @Headers('x-organization-id') org?: string) {
    return this.billing.cancel(req.user.sub, org);
  }
}
