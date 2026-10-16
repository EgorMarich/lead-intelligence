import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { OutreachMessageEntity } from '../../database/entities/outreach-message.entity';
import { SalesSequenceEntity } from '../../database/entities/sales-sequence.entity';
import { SequenceEnrollmentEntity } from '../../database/entities/sequence-enrollment.entity';
import { AiSalesDecisionEntity } from '../../database/entities/ai-sales-decision.entity';

@Injectable()
export class AiSalesManagerService {
  constructor(
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(CommunicationMessageEntity) private readonly messages: Repository<CommunicationMessageEntity>,
    @InjectRepository(OutreachMessageEntity) private readonly outreach: Repository<OutreachMessageEntity>,
    @InjectRepository(SalesSequenceEntity) private readonly sequences: Repository<SalesSequenceEntity>,
    @InjectRepository(SequenceEnrollmentEntity) private readonly enrollments: Repository<SequenceEnrollmentEntity>,
    @InjectRepository(AiSalesDecisionEntity) private readonly decisions: Repository<AiSalesDecisionEntity>,
  ) {}

  async briefing(organizationId: string) {
    const since = new Date(Date.now() - 30 * 86400000);
    const [leads, inbound, outbound, enrollments, sequences, decisions] = await Promise.all([
      this.leads.find({ where: { organizationId }, order: { score: 'DESC', updatedAt: 'DESC' }, take: 100 }),
      this.messages.find({ where: { organizationId, direction: 'INBOUND' }, order: { createdAt: 'DESC' }, take: 100 }),
      this.messages.find({ where: { organizationId, direction: 'OUTBOUND' }, order: { createdAt: 'DESC' }, take: 200 }),
      this.enrollments.find({ where: { organizationId, status: 'ACTIVE' }, order: { nextRunAt: 'ASC' }, take: 100 }),
      this.sequences.find({ where: { organizationId }, order: { updatedAt: 'DESC' }, take: 50 }),
      this.decisions.createQueryBuilder('d').where('d.organizationId = :organizationId', { organizationId }).andWhere('d.createdAt >= :since', { since }).orderBy('d.createdAt', 'DESC').take(100).getMany(),
    ]);

    const recentLeads = leads.filter(l => l.updatedAt >= since);
    const leadByBusiness = new Map(leads.map(l => [l.businessId, l]));
    const businessIds = Array.from(new Set([...leads.slice(0, 30), ...inbound.slice(0, 30)].map(x => x.businessId).filter(Boolean)));
    const businesses = businessIds.length ? await this.businesses.find({ where: { organizationId, id: In(businessIds) } }) : [];
    const businessMap = new Map(businesses.map(b => [b.id, b]));

    const latestInboundByBusiness = new Map<string, CommunicationMessageEntity>();
    for (const m of inbound) if (!latestInboundByBusiness.has(m.businessId)) latestInboundByBusiness.set(m.businessId, m);
    const latestOutboundByBusiness = new Map<string, CommunicationMessageEntity>();
    for (const m of outbound) if (!latestOutboundByBusiness.has(m.businessId)) latestOutboundByBusiness.set(m.businessId, m);

    const unanswered = inbound.filter(m => {
      const out = latestOutboundByBusiness.get(m.businessId);
      return !out || out.createdAt < m.createdAt;
    }).slice(0, 20);
    const stale = leads.filter(l => ['CONTACTED','INTERESTED'].includes(l.status) && l.updatedAt < new Date(Date.now() - 5 * 86400000)).slice(0, 20);
    const hot = leads.filter(l => ['INTERESTED','NEGOTIATION'].includes(l.status)).slice(0, 15);

    const channelStats = await this.outreach.createQueryBuilder('o')
      .select('o.channel', 'channel').addSelect('COUNT(*)', 'sent')
      .addSelect('COUNT(*) FILTER (WHERE o.status = :sentStatus)', 'successful')
      .where('o.organizationId = :organizationId', { organizationId })
      .andWhere('o.createdAt >= :since', { since })
      .setParameter('sentStatus', 'SENT').groupBy('o.channel').orderBy('COUNT(*)', 'DESC').getRawMany();

    const metrics = {
      leads: leads.length,
      newOrUpdated30d: recentLeads.length,
      hotLeads: hot.length,
      unansweredReplies: unanswered.length,
      staleLeads: stale.length,
      activeEnrollments: enrollments.length,
      activeSequences: sequences.filter(s => s.status === 'ACTIVE').length,
      pendingAiDecisions: decisions.filter((d:any) => ['GENERATED','QUEUED'].includes(d.status)).length,
      channelStats: channelStats.map((x:any) => ({ channel: x.channel, sent: Number(x.sent), successful: Number(x.successful) })),
    };

    const context = {
      metrics,
      hot: hot.slice(0, 8).map(l => ({ name: businessMap.get(l.businessId)?.name, status: l.status, score: l.score, dealValue: Number(l.dealValue ?? 0) })),
      unanswered: unanswered.slice(0, 8).map(m => ({ name: businessMap.get(m.businessId)?.name, channel: m.channel, ageHours: Math.round((Date.now() - m.createdAt.getTime()) / 3600000), preview: String(m.body).slice(0, 180) })),
      stale: stale.slice(0, 8).map(l => ({ name: businessMap.get(l.businessId)?.name, status: l.status, score: l.score, daysIdle: Math.round((Date.now() - l.updatedAt.getTime()) / 86400000) })),
      sequences: sequences.slice(0, 8).map(s => ({ name: s.name, status: s.status, mode: s.automationMode, aiEnabled: s.aiEnabled })),
    };

    const ai = await this.tryProvider(context);
    return { generatedAt: new Date().toISOString(), provider: ai ? 'openai-compatible' : 'heuristic', metrics, briefing: ai ?? this.heuristic(context), hotLeads: hot.slice(0, 8).map(l => ({ businessId: l.businessId, name: businessMap.get(l.businessId)?.name ?? 'Компания', status: l.status, score: l.score, dealValue: Number(l.dealValue ?? 0) })), unansweredReplies: unanswered.slice(0, 8).map(m => ({ businessId: m.businessId, name: businessMap.get(m.businessId)?.name ?? 'Компания', channel: m.channel, body: m.body, createdAt: m.createdAt })), staleLeads: stale.slice(0, 8).map(l => ({ businessId: l.businessId, name: businessMap.get(l.businessId)?.name ?? 'Компания', status: l.status, score: l.score, daysIdle: Math.round((Date.now() - l.updatedAt.getTime()) / 86400000) })) };
  }

  private heuristic(c:any) {
    const priorities:any[] = [];
    c.unanswered.slice(0,3).forEach((x:any) => priorities.push({ priority:'HIGH', title:`Ответить ${x.name}`, reason:`Входящий ответ без последующего исходящего касания уже ${x.ageHours} ч.`, action:'REVIEW_REPLY' }));
    c.hot.slice(0,3).forEach((x:any) => priorities.push({ priority:'HIGH', title:`Продвинуть ${x.name}`, reason:`Лид имеет статус ${x.status} и score ${x.score}.`, action:'OPEN_LEAD' }));
    c.stale.slice(0,3).forEach((x:any) => priorities.push({ priority:'MEDIUM', title:`Вернуть ${x.name}`, reason:`Лид без заметного движения ${x.daysIdle} дн.`, action:'FOLLOW_UP' }));
    const best = c.metrics.channelStats[0];
    return {
      headline: c.unanswered.length ? `Главный риск сегодня — потерять уже отвечающих клиентов.` : c.hot.length ? `Главная возможность сегодня — дожать горячие лиды.` : `Сегодня стоит сфокусироваться на новых и зависших лидах.`,
      summary: `В CRM ${c.metrics.leads} лидов, ${c.metrics.hotLeads} горячих, ${c.metrics.unansweredReplies} требуют ответа и ${c.metrics.staleLeads} давно не двигались.`,
      priorities: priorities.slice(0,7),
      opportunities: [c.hot.length ? `Сначала обработать ${c.hot.length} горячих лидов.` : 'Увеличить объём квалифицированных лидов.', best ? `За 30 дней больше всего отправок через ${best.channel}; стоит проверить качество ответов, а не только объём.` : 'Недостаточно данных по каналам.'],
      risks: [c.unanswered.length ? `${c.unanswered.length} входящих ответов могут остыть без быстрой реакции.` : 'Критичных необработанных ответов не найдено.', c.stale.length ? `${c.stale.length} лидов находятся без движения несколько дней.` : 'Заметного backlog по зависшим лидам нет.'],
      managerAdvice: priorities.length ? priorities[0].title : 'Запустить новый Discovery и проверить качество последних лидов.',
      confidence: 0.76,
    };
  }

  private async tryProvider(context:any): Promise<any|null> {
    const key = process.env.AI_API_KEY;
    if (!key || process.env.AI_ENABLED !== 'true') return null;
    const base = (process.env.AI_API_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    try {
      const response = await fetch(`${base}/chat/completions`, { method:'POST', headers:{'content-type':'application/json', authorization:`Bearer ${key}`}, body:JSON.stringify({ model:process.env.AI_MODEL ?? 'gpt-4.1-mini', temperature:0.2, response_format:{type:'json_object'}, messages:[{role:'system',content:'You are an AI sales manager. Return only JSON. Prioritize concrete actions for a human sales manager. Never invent facts. Use hypotheses when evidence is insufficient. Do not send messages or make irreversible decisions.'},{role:'user',content:`Analyze this CRM snapshot and produce JSON with keys headline, summary, priorities (array of priority/title/reason/action), opportunities (array), risks (array), managerAdvice, confidence.\n${JSON.stringify(context)}`}]}) });
      if (!response.ok) return null;
      const json:any = await response.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsed = JSON.parse(content);
      return { headline:String(parsed.headline ?? ''), summary:String(parsed.summary ?? ''), priorities:Array.isArray(parsed.priorities)?parsed.priorities.slice(0,8):[], opportunities:Array.isArray(parsed.opportunities)?parsed.opportunities.slice(0,8):[], risks:Array.isArray(parsed.risks)?parsed.risks.slice(0,8):[], managerAdvice:String(parsed.managerAdvice ?? ''), confidence:Math.max(0,Math.min(1,Number(parsed.confidence ?? .5))) };
    } catch { return null; }
  }
}
