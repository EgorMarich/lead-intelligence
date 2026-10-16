import { OutreachChannel } from '../../database/entities/outreach-message.entity';

export type OutreachTemplateInput = {
  channel: OutreachChannel;
  subject?: string;
  body: string;
  name?: string;
};

export type OutreachPreview = {
  businessId: string;
  leadId: string;
  channel: OutreachChannel;
  recipient: string;
  subject?: string;
  body: string;
};
