import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LeadEntity } from '../../database/entities/lead.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { CommunicationMessageEntity } from '../../database/entities/communication-message.entity';
import { SequenceEnrollmentEntity } from '../../database/entities/sequence-enrollment.entity';
import { SalesSequenceEntity } from '../../database/entities/sales-sequence.entity';
import { AiSalesDecisionEntity } from '../../database/entities/ai-sales-decision.entity';

@Injectable()
export class CommandCenterService {
  constructor(
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(CommunicationMessageEntity) private readonly messages: Repository<CommunicationMessageEntity>,
    @InjectRepository(SequenceEnrollmentEntity) private readonly enrollments: Repository<SequenceEnrollmentEntity>,
    @InjectRepository(SalesSequenceEntity) private readonly sequences: Repository<SalesSequenceEntity>,
    @InjectRepository(AiSalesDecisionEntity) private readonly decisions: Repository<AiSalesDecisionEntity>,
  ) {}

  async overview(organizationId: string) {
    const [hotLeads, activeEnrollments, recentInbound, pendingDecisions, leadCounts, sequenceCounts] = await Promise.all([
      this.leads.find({ where: { organizationId, status: In(['INTERESTED', 'NEGOTIATION']) }, order: { score: 'DESC', updatedAt: 'DESC' }, take: 12 }),
      this.enrollments.find({ where: { organizationId, status: 'ACTIVE' }, order: { nextRunAt: 'ASC' }, take: 12 }),
      this.messages.find({ where: { organizationId, direction: 'INBOUND' }, order: { createdAt: 'DESC' }, take: 12 }),
      this.decisions.find({ where: { organizationId, status: In(['GENERATED', 'QUEUED']) }, order: { createdAt: 'DESC' }, take: 12 }),
      this.leads.createQueryBuilder('l').select('l.status', 'status').addSelect('COUNT(*)', 'count').where('l.organizationId = :organizationId', { organizationId }).groupBy('l.status').getRawMany(),
      this.sequences.createQueryBuilder('s').select('s.status', 'status').addSelect('COUNT(*)', 'count').where('s.organizationId = :organizationId', { organizationId }).groupBy('s.status').getRawMany(),
    ]);

    const businessIds = Array.from(new Set([...hotLeads, ...recentInbound, ...activeEnrollments, ...pendingDecisions].map((x: any) => x.businessId).filter(Boolean)));
    const sequenceIds = Array.from(new Set(activeEnrollments.map(x => x.sequenceId)));
    const [businesses, sequences] = await Promise.all([
      businessIds.length ? this.businesses.find({ where: { organizationId, id: In(businessIds) } }) : [],
      sequenceIds.length ? this.sequences.find({ where: { organizationId, id: In(sequenceIds) } }) : [],
    ]);
    const businessMap = new Map(businesses.map(b => [b.id, b]));
    const sequenceMap = new Map(sequences.map(s => [s.id, s]));

    const actionItems = [
      ...hotLeads.map(lead => ({ type: 'HOT_LEAD', priority: lead.status === 'NEGOTIATION' ? 100 : 90, businessId: lead.businessId, leadId: lead.id, title: lead.status === 'NEGOTIATION' ? 'Горячий лид в переговорах' : 'Лид проявил интерес', description: `Score ${lead.score}. Требуется человеческое действие.`, action: lead.status === 'NEGOTIATION' ? 'RESPOND_NOW' : 'FOLLOW_UP' })),
      ...recentInbound.map((message: any) => ({ type: 'INBOUND_REPLY', priority: 95, businessId: message.businessId, leadId: message.leadId, title: 'Новый ответ клиента', description: String(message.body).slice(0, 180), action: 'REVIEW_REPLY', messageId: message.id })),
      ...pendingDecisions.map((decision: any) => ({ type: 'AI_DECISION', priority: 70, businessId: decision.businessId, leadId: decision.leadId, title: 'AI подготовил следующее касание', description: decision.recommendedAction, action: 'REVIEW_AI', decisionId: decision.id })),
      ...activeEnrollments.filter(e => e.nextRunAt && e.nextRunAt.getTime() <= Date.now()).map(e => ({ type: 'SEQUENCE_DUE', priority: 80, businessId: e.businessId, leadId: e.leadId, title: 'Sequence готова к запуску', description: sequenceMap.get(e.sequenceId)?.name ?? 'Sales sequence', action: 'OPEN_SEQUENCE', enrollmentId: e.id })),
    ].sort((a, b) => b.priority - a.priority).slice(0, 20);

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        hotLeads: hotLeads.length,
        activeSequences: Number(sequenceCounts.find(x => x.status === 'ACTIVE')?.count ?? 0),
        activeEnrollments: activeEnrollments.length,
        repliesToday: recentInbound.filter(x => x.createdAt.getTime() >= Date.now() - 86400000).length,
        pendingAiDecisions: pendingDecisions.length,
        pipelineValue: hotLeads.reduce((sum, x) => sum + Number(x.dealValue ?? 0), 0),
      },
      funnel: Object.fromEntries(leadCounts.map(x => [x.status, Number(x.count)])),
      sequences: Object.fromEntries(sequenceCounts.map(x => [x.status, Number(x.count)])),
      actions: actionItems,
      hotLeads: hotLeads.map(lead => ({ ...lead, business: businessMap.get(lead.businessId) ? { id: businessMap.get(lead.businessId)!.id, name: businessMap.get(lead.businessId)!.name, city: businessMap.get(lead.businessId)!.city } : null })),
      activeEnrollments: activeEnrollments.map(e => ({ ...e, sequenceName: sequenceMap.get(e.sequenceId)?.name ?? 'Sequence' })),
      recentReplies: recentInbound.map(m => ({ id: m.id, businessId: m.businessId, leadId: m.leadId, channel: m.channel, body: m.body, createdAt: m.createdAt })),
    };
  }
}
