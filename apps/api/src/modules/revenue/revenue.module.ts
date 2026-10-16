import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevenueController } from './revenue.controller';
import { RevenueService } from './revenue.service';
import { PaymentEntity } from '../../database/entities/payment.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { SubscriptionPlanEntity } from '../../database/entities/subscription-plan.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { OutreachMessageEntity } from '../../database/entities/outreach-message.entity';

@Module({ imports:[TypeOrmModule.forFeature([PaymentEntity,SubscriptionEntity,SubscriptionPlanEntity,LeadEntity,OutreachMessageEntity])], controllers:[RevenueController], providers:[RevenueService], exports:[RevenueService] })
export class RevenueModule {}
