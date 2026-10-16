import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillingService } from './billing.service';

@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);
  constructor(private readonly billing: BillingService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async renewSubscriptions() {
    try {
      const result = await this.billing.processRenewals();
      if (result.processed) this.logger.log(`Processed ${result.processed} subscription renewal(s)`);
    } catch (error) {
      this.logger.error('Subscription renewal cycle failed', error instanceof Error ? error.stack : String(error));
    }
  }
}
