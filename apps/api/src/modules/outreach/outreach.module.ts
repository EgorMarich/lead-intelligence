import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessEntity } from '../../database/entities/business.entity';
import { ContactEntity } from '../../database/entities/contact.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { OutreachMessageEntity } from '../../database/entities/outreach-message.entity';
import { OutreachTemplateEntity } from '../../database/entities/outreach-template.entity';
import { ConversationThreadEntity } from '../../database/entities/conversation-thread.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';
@Module({ imports: [TypeOrmModule.forFeature([BusinessEntity, ContactEntity, LeadEntity, OutreachMessageEntity, OutreachTemplateEntity, ConversationThreadEntity, CommunicationMessageEntity]), OrganizationsModule, AuthorizationModule], controllers: [OutreachController], providers: [OutreachService], exports: [OutreachService] })
export class OutreachModule {}
