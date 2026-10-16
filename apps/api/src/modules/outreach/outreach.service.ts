import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { QUEUES, OutreachQueuePayload } from '@lead/shared';
import { BusinessEntity } from '../../database/entities/business.entity';
import { ContactEntity } from '../../database/entities/contact.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { OutreachMessageEntity, OutreachChannel } from '../../database/entities/outreach-message.entity';
import { OutreachTemplateEntity } from '../../database/entities/outreach-template.entity';

@Injectable()
export class OutreachService {
  private readonly connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
  private readonly queue = new Queue<OutreachQueuePayload>(QUEUES.OUTREACH, { connection: this.connection });
  constructor(
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>,
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    @InjectRepository(OutreachMessageEntity) private readonly messages: Repository<OutreachMessageEntity>,
    @InjectRepository(OutreachTemplateEntity) private readonly templates: Repository<OutreachTemplateEntity>,
  ) {}

  async list(organizationId: string, businessId?: string) {
    return this.messages.find({ where: businessId ? { organizationId, businessId } : { organizationId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async preview(organizationId: string, businessId: string, channel: OutreachChannel) {
    const context = await this.context(organizationId, businessId);
    const contact = await this.pickContact(businessId, channel);
    if (!contact) throw new BadRequestException(`No ${channel} contact found`);
    const template = await this.templates.findOne({ where: { organizationId, channel, isDefault: true } });
    const body = render(template?.body ?? defaultBody(channel), context);
    const subject = template?.subject ? render(template.subject, context) : (channel === 'EMAIL' ? `Идея для ${context.business.name}` : undefined);
    return { businessId, leadId: context.lead.id, channel, recipient: contact.value, subject, body };
  }

  async create(organizationId: string, businessId: string, input: { channel: OutreachChannel; contactId?: string; subject?: string; body: string }) {
    const context = await this.context(organizationId, businessId);
    const contact = input.contactId ? await this.contacts.findOne({ where: { id: input.contactId, businessId } }) : await this.pickContact(businessId, input.channel);
    if (!contact) throw new BadRequestException(`No ${input.channel} contact found`);
    const message = await this.messages.save(this.messages.create({ id: randomUUID(), organizationId, businessId, leadId: context.lead.id, channel: input.channel, contactId: contact.id, recipient: contact.value, subject: input.subject, body: input.body, status: 'DRAFT', metadata: { generatedAt: new Date().toISOString() } }));
    return message;
  }

  async send(organizationId: string, id: string) {
    const message = await this.messages.findOne({ where: { id, organizationId } });
    if (!message) throw new NotFoundException('Outreach message not found');
    if (message.status === 'SENT') return message;
    message.status = 'QUEUED'; message.error = undefined; await this.messages.save(message);
    await this.queue.add('send-outreach', { messageId: message.id, organizationId }, { jobId: message.id, attempts: 3, backoff: { type: 'exponential', delay: 3000 }, removeOnComplete: { count: 1000 }, removeOnFail: { count: 5000 } });
    return message;
  }

  async templatesList(organizationId: string) { return this.templates.find({ where: { organizationId }, order: { createdAt: 'DESC' } }); }
  async createTemplate(organizationId: string, input: { name: string; channel: OutreachChannel; subject?: string; body: string }) {
    return this.templates.save(this.templates.create({ id: randomUUID(), organizationId, ...input, isDefault: false }));
  }

  private async context(organizationId: string, businessId: string) {
    const business = await this.businesses.findOne({ where: { id: businessId, organizationId } });
    const lead = await this.leads.findOne({ where: { businessId, organizationId } });
    if (!business || !lead) throw new NotFoundException('Lead not found');
    return { business, lead };
  }
  private async pickContact(businessId: string, channel: OutreachChannel) {
    const contacts = await this.contacts.find({ where: { businessId, type: channel as any }, order: { isPrimary: 'DESC' } });
    return contacts[0];
  }
  async onApplicationShutdown() { await this.queue.close(); await this.connection.quit(); }
}

function render(text: string, ctx: any) {
  return text.replace(/{{\s*([\w.]+)\s*}}/g, (_, path) => path.split('.').reduce((v: any, key: string) => v?.[key], ctx) ?? '');
}
function defaultBody(channel: OutreachChannel) {
  if (channel === 'EMAIL') return 'Здравствуйте!\n\nНашёл {{business.name}} и заметил, что у компании есть точки роста в digital-продажах. Могу показать короткий разбор сайта и несколько конкретных идей.\n\nЕсли интересно, отправлю бесплатно.';
  return 'Здравствуйте! Нашёл {{business.name}}. Есть несколько идей, как усилить привлечение клиентов через digital. Могу отправить короткий разбор.';
}
