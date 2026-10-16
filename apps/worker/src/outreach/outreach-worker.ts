import crypto from 'crypto';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { DataSource } from 'typeorm';
import { QUEUES, OutreachQueuePayload } from '@lead/shared';
import { OutreachMessageEntity } from '../../../api/src/database/entities/outreach-message.entity';
import { LeadEntity } from '../../../api/src/database/entities/lead.entity';
import { ContactEntity } from '../../../api/src/database/entities/contact.entity';
import { CommunicationMessageEntity } from '../../../api/src/database/entities/communication-message.entity';
import { ConversationThreadEntity } from '../../../api/src/database/entities/conversation-thread.entity';
import { AiSalesDecisionEntity } from '../../../api/src/database/entities/ai-sales-decision.entity';
import { sendTelegram, sendVk, sendWhatsApp } from './communication-providers';

export function createOutreachWorker(connection: IORedis, db: DataSource) {
  const messages = db.getRepository(OutreachMessageEntity);
  const leads = db.getRepository(LeadEntity);
  const contacts = db.getRepository(ContactEntity);
  const communicationMessages = db.getRepository(CommunicationMessageEntity);
  const threads = db.getRepository(ConversationThreadEntity);
  const aiDecisions = db.getRepository(AiSalesDecisionEntity);
  return new Worker<OutreachQueuePayload>(QUEUES.OUTREACH, async (queueJob) => {
    const message = await messages.findOne({ where: { id: queueJob.data.messageId, organizationId: queueJob.data.organizationId } });
    if (!message) throw new Error('Outreach message not found');
    message.status = 'SENDING'; message.attempts += 1; message.error = undefined; await messages.save(message);
    try {
      const contact = message.contactId ? await contacts.findOne({ where: { id: message.contactId, businessId: message.businessId } }) : null;
      if (contact?.metadata?.doNotContact === true) throw new Error('Contact is suppressed (do-not-contact)');
      let providerMessageId = ''; let providerMetadata: Record<string, unknown> = {};
      if (message.channel === 'EMAIL') {
        const smtpHost = process.env.SMTP_HOST, smtpUser = process.env.SMTP_USER, smtpPass = process.env.SMTP_PASS, smtpFrom = process.env.SMTP_FROM ?? smtpUser;
        if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) throw new Error('SMTP is not configured');
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: smtpUser, pass: smtpPass } });
        const info = await transporter.sendMail({ from: smtpFrom, to: message.recipient, subject: message.subject ?? 'Предложение', text: message.body });
        providerMessageId = info.messageId ?? crypto.randomUUID(); providerMetadata = { provider: 'smtp' };
      } else if (message.channel === 'TELEGRAM') ({ providerMessageId, metadata: providerMetadata } = await sendTelegram(message.recipient, message.body));
      else if (message.channel === 'VK') ({ providerMessageId, metadata: providerMetadata } = await sendVk(message.recipient, message.body));
      else if (message.channel === 'WHATSAPP') ({ providerMessageId, metadata: providerMetadata } = await sendWhatsApp(message.recipient, message.body));
      else throw new Error(`${message.channel} provider is not configured`);

      const aiDecisionId = typeof message.metadata?.aiDecisionId === 'string' ? message.metadata.aiDecisionId : undefined;
      if (aiDecisionId) { const d=await aiDecisions.findOne({where:{id:aiDecisionId,organizationId:message.organizationId}}); if(d){d.status='SENT';await aiDecisions.save(d)} }
      message.status = 'SENT'; message.sentAt = new Date(); message.metadata = { ...(message.metadata ?? {}), providerMessageId, ...providerMetadata }; await messages.save(message);
      let thread = await threads.findOne({ where: { organizationId: message.organizationId, businessId: message.businessId, channel: message.channel as any } });
      if (!thread) thread = await threads.save(threads.create({ id: crypto.randomUUID(), organizationId: message.organizationId, businessId: message.businessId, leadId: message.leadId, channel: message.channel as any, externalThreadId: message.recipient, status:'OPEN' }));
      thread.lastMessageAt = new Date(); thread.updatedAt = new Date(); await threads.save(thread);
      await communicationMessages.save(communicationMessages.create({ id: crypto.randomUUID(), organizationId: message.organizationId, businessId: message.businessId, leadId: message.leadId, threadId: thread.id, channel: message.channel as any, direction:'OUTBOUND', providerMessageId, sender: process.env.SMTP_FROM ?? 'system', recipient: message.recipient, subject: message.subject, body: message.body, status:'SENT', metadata: providerMetadata }));
      const lead = await leads.findOne({ where: { id: message.leadId, organizationId: message.organizationId } });
      if (lead) { lead.status = lead.status === 'NEW' ? 'CONTACTED' : lead.status; lead.activities = [...(lead.activities ?? []), { id: crypto.randomUUID(), type: 'OUTREACH_SENT', text: `Отправлено ${message.channel}`, metadata: { messageId: message.id, recipient: message.recipient, providerMessageId }, createdAt: new Date().toISOString() }]; await leads.save(lead); }
      return { sent: true, providerMessageId };
    } catch (error: any) { const aiDecisionId = typeof message.metadata?.aiDecisionId === 'string' ? message.metadata.aiDecisionId : undefined; if(aiDecisionId){const d=await aiDecisions.findOne({where:{id:aiDecisionId,organizationId:message.organizationId}});if(d){d.status='FAILED';await aiDecisions.save(d)}} message.status = 'FAILED'; message.error = error?.message ?? 'Outreach failed'; await messages.save(message); throw error; }
  }, { connection, concurrency: Number(process.env.OUTREACH_CONCURRENCY ?? 2) });
}
