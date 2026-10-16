import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ConversationThreadEntity, ConversationChannel } from '../../database/entities/conversation-thread.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BusinessEntity } from '../../database/entities/business.entity';

@Injectable()
export class CommunicationsService {
  constructor(
    @InjectRepository(ConversationThreadEntity) private readonly threads: Repository<ConversationThreadEntity>,
    @InjectRepository(CommunicationMessageEntity) private readonly messages: Repository<CommunicationMessageEntity>,
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
  ) {}

  async listThreads(organizationId: string, businessId: string) {
    if (!organizationId) return [];
    return this.threads.find({ where: { organizationId, businessId }, order: { lastMessageAt: 'DESC' } });
  }

  async listMessages(organizationId: string, businessId: string) {
    if (!organizationId) return [];
    return this.messages.find({ where: { organizationId, businessId }, order: { createdAt: 'ASC' }, take: 200 });
  }

  async handleTelegramWebhook(secret: string, update: any) {
    if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) return { ok: false };
    const m = update?.message;
    if (!m?.text || !m?.chat?.id) return { ok: true, ignored: true };
    const org = process.env.TELEGRAM_ORGANIZATION_ID;
    if (!org) return { ok: true, ignored: true };
    const recipient = String(m.chat.id);
    return this.ingestInbound(org, 'TELEGRAM', recipient, recipient, m.text, String(m.message_id), { username: m.from?.username });
  }

  verifyWhatsApp(mode: string, token: string, challenge: string) {
    if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) return challenge;
    return 'verification_failed';
  }

  async handleWhatsAppWebhook(body: any) {
    const org = process.env.WHATSAPP_ORGANIZATION_ID;
    if (!org) return { ok: true, ignored: true };
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg || msg.type !== 'text') return { ok: true, ignored: true };
    const text = msg.text?.body; if (!text) return { ok: true, ignored: true };
    return this.ingestInbound(org, 'WHATSAPP', String(msg.from), String(value?.metadata?.display_phone_number ?? ''), text, String(msg.id), { phoneNumberId: value?.metadata?.phone_number_id });
  }

  async handleVkWebhook(secret: string, body: any) {
    if (!process.env.VK_CALLBACK_SECRET || secret !== process.env.VK_CALLBACK_SECRET) return { ok: false };
    if (body?.type === 'confirmation') return process.env.VK_CONFIRMATION_TOKEN ?? 'ok';
    if (body?.type !== 'message_new' || !body?.object?.text) return { ok: true };
    const org = process.env.VK_ORGANIZATION_ID;
    if (!org) return { ok: true, ignored: true };
    const peer = String(body.object.peer_id ?? body.object.from_id ?? '');
    return this.ingestInbound(org, 'VK', peer, peer, body.object.text, String(body.object.id ?? body.group_id + ':' + Date.now()), { groupId: body.group_id });
  }

  private async ingestInbound(organizationId: string, channel: ConversationChannel, sender: string, recipient: string, body: string, providerMessageId: string, metadata: Record<string, unknown>) {
    const existing = await this.messages.findOne({ where: { organizationId, providerMessageId } });
    if (existing) return { ok: true, duplicate: true };
    let thread = await this.threads.findOne({ where: { organizationId, externalThreadId: sender, channel } });
    let lead = thread ? await this.leads.findOne({ where: { id: thread.leadId, organizationId } }) : null;
    if (!lead) {
      const business = await this.businesses.findOne({ where: { organizationId, phone: sender } });
      if (business) lead = await this.leads.findOne({ where: { organizationId, businessId: business.id } });
    }
    if (!lead) return { ok: true, unmatched: true };
    if (!thread) thread = await this.threads.save(this.threads.create({ id: randomUUID(), organizationId, businessId: lead.businessId, leadId: lead.id, channel, externalThreadId: sender, status: 'OPEN' }));
    const message = await this.messages.save(this.messages.create({ id: randomUUID(), organizationId, businessId: lead.businessId, leadId: lead.id, threadId: thread.id, channel, direction: 'INBOUND', providerMessageId, sender, recipient, body, status: 'RECEIVED', metadata }));
    thread.lastMessageAt = new Date(); thread.updatedAt = new Date(); await this.threads.save(thread);
    await this.classifyInbound(lead, message);
    return { ok: true, messageId: message.id };
  }

  private async classifyInbound(lead: LeadEntity, message: CommunicationMessageEntity) {
    const text = message.body.toLowerCase();
    const stop = /(стоп|не пишите|не интересно|отпиш|unsubscribe|stop)/i.test(text);
    const negotiation = /(цена|стоимость|сколько|договор|встреч|созвон|демо|срок|коммерческ)/i.test(text);
    const positive = /(интересно|давайте|интересует|хочу|можно подробнее|расскажите)/i.test(text);
    const status = stop ? 'LOST' : negotiation ? 'NEGOTIATION' : positive ? 'INTERESTED' : 'CONTACTED';
    lead.status = status as any;
    lead.activities = [...(lead.activities ?? []), { id: randomUUID(), type: 'INBOUND_REPLY', text: `Входящий ответ в ${message.channel}: ${status}`, metadata: { messageId: message.id, classification: status, optOut: stop }, createdAt: new Date().toISOString() }];
    await this.leads.save(lead);
  }
}
