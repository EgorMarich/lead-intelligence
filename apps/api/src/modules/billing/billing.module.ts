import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingScheduler } from './billing.scheduler';
import { YooKassaClient } from './yookassa.client';
import { SubscriptionPlanEntity } from '../../database/entities/subscription-plan.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { OrganizationUsageEntity } from '../../database/entities/usage.entity';
import { OrganizationMemberEntity } from '../../database/entities/organization-member.entity';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlanEntity, SubscriptionEntity, PaymentEntity, OrganizationUsageEntity, OrganizationMemberEntity]),
    OrganizationsModule,
  ],
  controllers: [BillingController],
  providers: [BillingService, BillingScheduler, YooKassaClient],
  exports: [BillingService],
})
export class BillingModule {}
