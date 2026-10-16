import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSalesManagerController } from './ai-sales-manager.controller';
import { AiSalesManagerService } from './ai-sales-manager.service';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { OutreachMessageEntity } from '../../database/entities/outreach-message.entity';
import { SalesSequenceEntity } from '../../database/entities/sales-sequence.entity';
import { SequenceEnrollmentEntity } from '../../database/entities/sequence-enrollment.entity';
import { AiSalesDecisionEntity } from '../../database/entities/ai-sales-decision.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [TypeOrmModule.forFeature([LeadEntity, BusinessEntity, CommunicationMessageEntity, OutreachMessageEntity, SalesSequenceEntity, SequenceEnrollmentEntity, AiSalesDecisionEntity]), OrganizationsModule, AuthorizationModule],
  controllers: [AiSalesManagerController],
  providers: [AiSalesManagerService],
})
export class AiSalesManagerModule {}
