import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AiReplySuggestionEntity } from '../../database/entities/ai-reply-suggestion.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { OutreachService } from '../outreach/outreach.service';

@Injectable()
export class AiReplyCopilotService {
  constructor(
    @InjectRepository(AiReplySuggestionEntity) private readonly suggestions: Repository<AiReplySuggestionEntity>,
    @InjectRepository(CommunicationMessageEntity) private readonly messages: Repository<CommunicationMessageEntity>,
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    private readonly outreach: OutreachService,
  ) {}

  async suggest(organizationId: string, businessId: string) {
    const message = await this.messages.findOne({ where: { organizationId, businessId, direction: 'INBOUND' }, order: { createdAt: 'DESC' } });
    if (!message) throw new NotFoundException('No inbound message found');
    const lead = await this.leads.findOne({ where: { id: message.leadId, organizationId } });
    if (!lead) throw new NotFoundException('Lead not found');
    const result = await this.generate(message.body);
    const saved = await this.suggestions.save(this.suggestions.create({ id: randomUUID(), organizationId, businessId, leadId: lead.id, messageId: message.id, channel: message.channel, suggestion: result.reply, subject: message.channel === 'EMAIL' ? 'Re: ваше сообщение' : undefined, analysis: result.analysis }));
    return saved;
  }

  async latest(organizationId: string, businessId: string) {
    return this.suggestions.findOne({ where: { organizationId, businessId }, order: { createdAt: 'DESC' } });
  }

  async use(organizationId: string, id: string, editedBody?: string) {
    const suggestion = await this.suggestions.findOne({ where: { id, organizationId } });
    if (!suggestion) throw new NotFoundException('Suggestion not found');
    if (suggestion.status === 'USED') return suggestion;
    const contactType = suggestion.channel as any;
    const created = await this.outreach.create(organizationId, suggestion.businessId, { channel: contactType, body: editedBody?.trim() || suggestion.suggestion, subject: suggestion.subject });
    await this.outreach.send(organizationId, created.id);
    suggestion.status = 'USED';
    await this.suggestions.save(suggestion);
    return { suggestion, outreachMessageId: created.id };
  }

  async dismiss(organizationId: string, id: string) {
    const suggestion = await this.suggestions.findOne({ where: { id, organizationId } });
    if (!suggestion) throw new NotFoundException('Suggestion not found');
    suggestion.status = 'DISMISSED';
    return this.suggestions.save(suggestion);
  }

  private async generate(inbound: string) {
    const aiKey = process.env.AI_API_KEY;
    if (aiKey && process.env.AI_ENABLED === 'true') {
      try {
        const base = (process.env.AI_API_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
        const response = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${aiKey}` }, body: JSON.stringify({ model: process.env.AI_MODEL ?? 'gpt-4.1-mini', temperature: 0.25, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: 'Ты AI sales copilot. Проанализируй входящий ответ потенциального клиента и предложи короткий естественный ответ. Не выдумывай факты, не дави на клиента, уважай отказ. Верни JSON: intent, sentiment, recommendedAction, reply.' },
          { role: 'user', content: `ВХОДЯЩИЙ ОТВЕТ:\n${inbound}` },
        ] }) });
        if (response.ok) {
          const json: any = await response.json();
          const parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? '{}');
          if (parsed.reply) return { reply: String(parsed.reply), analysis: { intent: String(parsed.intent ?? 'UNKNOWN'), sentiment: String(parsed.sentiment ?? 'NEUTRAL'), recommendedAction: String(parsed.recommendedAction ?? 'FOLLOW_UP'), provider: 'openai-compatible' } };
        }
      } catch {}
    }
    return heuristicReply(inbound);
  }
}

function heuristicReply(text: string) {
  const t = text.toLowerCase();
  if (/(стоп|не пишите|не интересно|отпиш|unsubscribe)/i.test(t)) return { reply: 'Понял, спасибо за ответ. Больше не буду вас беспокоить. Хорошего дня!', analysis: { intent: 'OPT_OUT', sentiment: 'NEGATIVE', recommendedAction: 'STOP_CONTACT', provider: 'heuristic' } };
  if (/(цена|стоимость|сколько)/i.test(t)) return { reply: 'Конечно. Чтобы назвать подходящий вариант и не предлагать лишнего, могу уточнить пару деталей о вашей текущей задаче. После этого покажу варианты и стоимость.', analysis: { intent: 'PRICING', sentiment: 'NEUTRAL', recommendedAction: 'QUALIFY', provider: 'heuristic' } };
  if (/(давайте|интересно|интересует|подробнее|расскажите|можно)/i.test(t)) return { reply: 'Отлично. Тогда предлагаю коротко разобраться в вашей текущей ситуации и показать 2–3 наиболее релевантные идеи. Когда вам удобно обсудить это 10–15 минут?', analysis: { intent: 'INTERESTED', sentiment: 'POSITIVE', recommendedAction: 'BOOK_CALL', provider: 'heuristic' } };
  return { reply: 'Спасибо за ответ! Чтобы понять, будет ли наше предложение действительно полезно, подскажите, пожалуйста, какая задача сейчас для вас наиболее приоритетна?', analysis: { intent: 'QUALIFICATION', sentiment: 'NEUTRAL', recommendedAction: 'QUALIFY', provider: 'heuristic' } };
}
