import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationThreadEntity } from '../../database/entities/conversation-thread.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { AiReplySuggestionEntity } from '../../database/entities/ai-reply-suggestion.entity';
import { OutreachModule } from '../outreach/outreach.module';
import { AiReplyCopilotController } from './ai-reply-copilot.controller';
import { AiReplyCopilotService } from './ai-reply-copilot.service';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { AiIntelligenceModule } from '../ai-intelligence/ai-intelligence.module';
@Module({ imports: [TypeOrmModule.forFeature([ConversationThreadEntity, CommunicationMessageEntity, LeadEntity, BusinessEntity, AiReplySuggestionEntity]), AiIntelligenceModule, OutreachModule], controllers: [CommunicationsController, AiReplyCopilotController], providers: [CommunicationsService, AiReplyCopilotService], exports: [CommunicationsService] })
export class CommunicationsModule {}
