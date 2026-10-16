import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesSequenceEntity } from '../../database/entities/sales-sequence.entity';
import { SequenceEnrollmentEntity } from '../../database/entities/sequence-enrollment.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { SequencesController } from './sequences.controller';
import { SequencesService } from './sequences.service';
import { AiSalesAutomationService } from './ai-sales-automation.service';
import { ContactEntity } from '../../database/entities/contact.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { AiInsightEntity } from '../../database/entities/ai-insight.entity';
@Module({imports:[TypeOrmModule.forFeature([SalesSequenceEntity,SequenceEnrollmentEntity,BusinessEntity,LeadEntity,ContactEntity,CommunicationMessageEntity,AiInsightEntity]),OrganizationsModule,AuthorizationModule],controllers:[SequencesController],providers:[SequencesService,AiSalesAutomationService],exports:[SequencesService]})
export class SequencesModule {}
