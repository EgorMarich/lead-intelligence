import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiInsightEntity, AiInsightPayload } from '../../database/entities/ai-insight.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { LeadEntity } from '../../database/entities/lead.entity';
import { LeadScoreEntity } from '../../database/entities/lead-score.entity';
import { BusinessFeatureEntity } from '../../database/entities/business-feature.entity';
import { ContactEntity } from '../../database/entities/contact.entity';
import { OutreachMessageEntity } from '../../database/entities/outreach-message.entity';

@Injectable()
export class AiIntelligenceService {
  constructor(
    @InjectRepository(AiInsightEntity) private readonly insights: Repository<AiInsightEntity>,
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    @InjectRepository(LeadScoreEntity) private readonly scores: Repository<LeadScoreEntity>,
    @InjectRepository(BusinessFeatureEntity) private readonly features: Repository<BusinessFeatureEntity>,
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>,
    @InjectRepository(OutreachMessageEntity) private readonly outreach: Repository<OutreachMessageEntity>,
  ) {}

  async get(organizationId: string, businessId: string) {
    return this.insights.findOne({ where: { organizationId, businessId } });
  }

  async analyze(organizationId: string, businessId: string) {
    const business = await this.businesses.findOne({ where: { id: businessId, organizationId } });
    if (!business) throw new NotFoundException('Business not found');
    const [lead, score, features, contacts, outreach] = await Promise.all([
      this.leads.findOne({ where: { businessId, organizationId } }),
      this.scores.findOne({ where: { businessId }, order: { calculatedAt: 'DESC' } }),
      this.features.find({ where: { businessId }, order: { detectedAt: 'DESC' } }),
      this.contacts.find({ where: { businessId }, order: { isPrimary: 'DESC' } }),
      this.outreach.find({ where: { businessId, organizationId }, order: { createdAt: 'DESC' }, take: 10 }),
    ]);
    const context = { business, lead, score, features, contacts, outreach };
    const ai = await this.tryProvider(context);
    const payload = ai ?? this.heuristic(context);
    const entity = await this.insights.findOne({ where: { organizationId, businessId } }) ?? this.insights.create({ organizationId, businessId });
    entity.payload = payload;
    entity.provider = ai ? 'openai-compatible' : 'heuristic';
    entity.model = ai ? (process.env.AI_MODEL ?? 'gpt-4.1-mini') : 'lead-intelligence-heuristic-v1';
    entity.updatedAt = new Date();
    entity.generatedAt = new Date();
    const saved = await this.insights.save(entity);
    if (lead) {
      lead.activities = [...(lead.activities ?? []), { id: randomUUID(), type: 'AI_ANALYSIS_GENERATED', metadata: { provider: entity.provider, icpFit: payload.icpFit }, createdAt: new Date().toISOString() }];
      await this.leads.save(lead);
    }
    return saved;
  }

  private async tryProvider(context: any): Promise<AiInsightPayload | null> {
    const key = process.env.AI_API_KEY;
    if (!key || process.env.AI_ENABLED !== 'true') return null;
    const base = (process.env.AI_API_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    const prompt = this.prompt(context);
    try {
      const response = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ model: process.env.AI_MODEL ?? 'gpt-4.1-mini', temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'You are a B2B sales intelligence analyst. Return only valid JSON matching the requested schema. Do not invent facts; mark uncertain claims as hypotheses.' }, { role: 'user', content: prompt }] }) });
      if (!response.ok) return null;
      const json: any = await response.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsed = JSON.parse(content);
      return this.normalize(parsed);
    } catch { return null; }
  }

  private prompt(c: any) {
    return `Analyze this lead for B2B sales.\nBUSINESS=${JSON.stringify(c.business)}\nSCORE=${JSON.stringify(c.score)}\nFEATURES=${JSON.stringify(c.features.map((x:any)=>({feature:x.feature,value:x.value,confidence:x.confidence})))}\nCONTACTS=${JSON.stringify(c.contacts.map((x:any)=>({type:x.type,value:x.value,isPrimary:x.isPrimary})))}\nLEAD=${JSON.stringify(c.lead)}\nOUTREACH_HISTORY=${JSON.stringify(c.outreach.map((x:any)=>({channel:x.channel,status:x.status,createdAt:x.createdAt})))}\nReturn JSON with keys: summary:string, icpFit:number 0-100, painPoints:[{title,evidence,impact:LOW|MEDIUM|HIGH}], pitch:string, recommendedChannels:[{channel,reason,priority:number}], objections:[{objection,response}], nextBestAction:{action,reason}, outreachVariants:[{channel,subject?,body}], confidence:number 0-1.`;
  }

  private heuristic(c: any): AiInsightPayload {
    const f = new Set(c.features.filter((x:any)=>x.value).map((x:any)=>x.feature));
    const hasWebsite = Boolean(c.business.website) || f.has('WEBSITE');
    const booking = f.has('ONLINE_BOOKING');
    const hasEmail = c.contacts.some((x:any)=>x.type === 'EMAIL');
    const hasPhone = c.contacts.some((x:any)=>x.type === 'PHONE');
    const hasSocial = ['TELEGRAM','VK','WHATSAPP','INSTAGRAM'].some(x=>f.has(x));
    const painPoints: AiInsightPayload['painPoints'] = [];
    if (!hasWebsite) painPoints.push({ title: 'Нет обнаруженного сайта', evidence: 'У компании не указан сайт или он не был подтверждён.', impact: 'HIGH' });
    if (hasWebsite && !booking) painPoints.push({ title: 'Нет онлайн-записи', evidence: 'На сайте не обнаружен сигнал онлайн-записи.', impact: 'HIGH' });
    if (!hasEmail && !hasPhone) painPoints.push({ title: 'Слабая контактируемость', evidence: 'Не найден email или телефон.', impact: 'MEDIUM' });
    if (!hasSocial) painPoints.push({ title: 'Слабое digital-присутствие', evidence: 'Не обнаружены основные социальные каналы.', impact: 'MEDIUM' });
    const score = Number(c.score?.score ?? c.lead?.score ?? 0);
    const icpFit = Math.max(20, Math.min(98, Math.round(score * 0.75 + (painPoints.length ? 20 : 5))));
    const channels = hasEmail ? [{ channel: 'EMAIL', reason: 'Есть прямой email и можно отправить персональный разбор.', priority: 1 }] : [];
    if (hasPhone) channels.push({ channel: 'PHONE', reason: 'Телефон позволяет быстро проверить интерес и найти ЛПР.', priority: channels.length + 1 });
    if (hasSocial) channels.push({ channel: f.has('TELEGRAM') ? 'TELEGRAM' : 'VK', reason: 'Найден social contact с низким friction для первого касания.', priority: channels.length + 1 });
    if (!channels.length) channels.push({ channel: 'EMAIL', reason: 'Рекомендуется сначала получить контакт после дополнительного enrichment.', priority: 1 });
    return {
      summary: `${c.business.name} — ${icpFit >= 70 ? 'перспективный' : 'средний'} lead. Основная возможность — предложить решение на основе обнаруженных digital-разрывов, а не делать массовое сообщение.`,
      icpFit,
      painPoints,
      pitch: `Предложить ${c.business.name} короткий персональный разбор и 2–3 конкретных улучшения, которые могут увеличить поток обращений.`,
      recommendedChannels: channels,
      objections: [{ objection: '«Нам это сейчас не нужно»', response: 'Предложить бесплатный короткий разбор без обязательств и показать только факты по компании.' }, { objection: '«Сколько это стоит?»', response: 'Сначала зафиксировать проблему и ожидаемый эффект, затем предложить подходящий формат.' }],
      nextBestAction: { action: painPoints.length ? 'Отправить персонализированный разбор' : 'Провести короткую квалификацию', reason: painPoints.length ? 'Есть конкретные точки роста, на которых можно построить первый контакт.' : 'Недостаточно выраженных проблем — сначала нужно подтвердить потребность.' },
      outreachVariants: channels.slice(0, 3).map(ch => ({ channel: ch.channel, subject: ch.channel === 'EMAIL' ? `Идея для ${c.business.name}` : undefined, body: `Здравствуйте! Изучил ${c.business.name} и заметил несколько точек роста в digital. Могу бесплатно отправить короткий разбор с конкретными идеями именно для вашей компании. Если интересно — пришлю.` })),
      confidence: 0.72,
    };
  }

  private normalize(x: any): AiInsightPayload {
    return { summary: String(x.summary ?? ''), icpFit: clamp(x.icpFit), painPoints: Array.isArray(x.painPoints) ? x.painPoints.slice(0, 8) : [], pitch: String(x.pitch ?? ''), recommendedChannels: Array.isArray(x.recommendedChannels) ? x.recommendedChannels.slice(0, 6) : [], objections: Array.isArray(x.objections) ? x.objections.slice(0, 6) : [], nextBestAction: x.nextBestAction ?? { action: 'Проверить лид', reason: 'Недостаточно данных' }, outreachVariants: Array.isArray(x.outreachVariants) ? x.outreachVariants.slice(0, 6) : [], confidence: Math.max(0, Math.min(1, Number(x.confidence ?? 0.5))) };
  }
}
function clamp(value: unknown) { return Math.max(0, Math.min(100, Number(value ?? 0))); }
