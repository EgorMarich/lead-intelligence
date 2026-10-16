import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { SequenceEnrollmentEntity } from '../../database/entities/sequence-enrollment.entity';
import { SalesSequenceEntity } from '../../database/entities/sales-sequence.entity';
import { AiSalesDecisionEntity } from '../../database/entities/ai-sales-decision.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CommandCenterController } from './command-center.controller';
import { CommandCenterService } from './command-center.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeadEntity, BusinessEntity, CommunicationMessageEntity, SequenceEnrollmentEntity, SalesSequenceEntity, AiSalesDecisionEntity]), OrganizationsModule, AuthorizationModule],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
})
export class CommandCenterModule {}
