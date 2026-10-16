import { Body, Controller, Get, Param, Put, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessEntity } from '../../database/entities/business.entity';
import { LeadScoreEntity } from '../../database/entities/lead-score.entity';
import { BusinessFeatureEntity } from '../../database/entities/business-feature.entity';
import { ContactEntity } from '../../database/entities/contact.entity';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { Permission } from '../authorization/permission';
import { LeadEntity, PersistentLeadStatus } from '../../database/entities/lead.entity';
import { randomUUID } from 'crypto';

@Controller('lead-intelligence')
@UseGuards(JwtAuthGuard)
export class LeadIntelligenceController {
  constructor(
    @InjectRepository(BusinessEntity) private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(LeadScoreEntity) private readonly scores: Repository<LeadScoreEntity>,
    @InjectRepository(BusinessFeatureEntity) private readonly features: Repository<BusinessFeatureEntity>,
    @InjectRepository(ContactEntity) private readonly contacts: Repository<ContactEntity>,
    @InjectRepository(LeadEntity) private readonly leads: Repository<LeadEntity>,
    private readonly orgs: CurrentOrganizationService,
    private readonly authorization: AuthorizationService,
  ) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('city') city?: string,
    @Query('minScore') minScore?: string,
    @Query('grade') grade?: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.SEARCH_READ);

    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = Math.max(Number(offset) || 0, 0);
    const qb = this.businesses.createQueryBuilder('b').where('b.organizationId = :organizationId', { organizationId });
    if (city) qb.andWhere('b.city ILIKE :city', { city: `%${city}%` });

    const businesses = await qb.orderBy('b.updatedAt', 'DESC').skip(skip).take(take).getMany();
    const ids = businesses.map((b) => b.id);
    const scores = ids.length
      ? await this.scores.createQueryBuilder('s').where('s.businessId IN (:...ids)', { ids }).orderBy('s.calculatedAt', 'DESC').getMany()
      : [];
    const latest = new Map<string, LeadScoreEntity>();
    for (const score of scores) if (!latest.has(score.businessId)) latest.set(score.businessId, score);

    const filtered = businesses.filter((business) => {
      const score = latest.get(business.id);
      if (minScore && (!score || score.score < Number(minScore))) return false;
      if (grade && (!score || score.grade !== grade)) return false;
      return true;
    });

    return {
      data: filtered.map((business) => ({ business, score: latest.get(business.id) ?? null })),
      meta: { count: filtered.length, limit: take, offset: skip },
    };
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.SEARCH_READ);
    const business = await this.businesses.findOneBy({ id, organizationId });
    if (!business) return { data: null };
    const [score, features, contacts, lead] = await Promise.all([
      this.scores.findOne({ where: { businessId: id }, order: { calculatedAt: 'DESC' } }),
      this.features.find({ where: { businessId: id }, order: { detectedAt: 'DESC' } }),
      this.contacts.find({ where: { businessId: id }, order: { isPrimary: 'DESC' } }),
      this.leads.findOne({ where: { businessId: id, organizationId } }),
    ]);
    return { data: { business, score, features, contacts, lead } };
  }

  @Put(':id/crm')
  async updateCrm(@Param('id') id: string, @Req() req: any, @Body() body: { status?: PersistentLeadStatus; assigneeId?: string | null; tags?: string[]; dealValue?: number; revenue?: number }) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.BUSINESS_WRITE);
    const business = await this.businesses.findOneBy({ id, organizationId });
    if (!business) return { data: null };
    let lead = await this.leads.findOne({ where: { businessId: id, organizationId } });
    if (!lead) {
      const score = await this.scores.findOne({ where: { businessId: id }, order: { calculatedAt: 'DESC' } });
      lead = this.leads.create({ organizationId, businessId: id, score: score?.score ?? 0, grade: score?.grade, scoreReasons: score?.reasons ?? [], status: 'NEW', tags: [], notes: [], activities: [] });
    }
    const previousStatus = lead.status;
    if (body.status) lead.status = body.status;
    if (body.assigneeId !== undefined) lead.assigneeId = body.assigneeId ?? undefined;
    if (body.tags) lead.tags = [...new Set(body.tags.map((x) => x.trim()).filter(Boolean))];
    if (body.dealValue !== undefined) lead.dealValue = Math.max(0, Number(body.dealValue) || 0);
    if (body.revenue !== undefined) lead.revenue = Math.max(0, Number(body.revenue) || 0);
    if (previousStatus !== lead.status) this.addActivity(lead, 'STATUS_CHANGED', req.user.sub, { from: previousStatus, to: lead.status });
    lead.updatedAt = new Date();
    return { data: await this.leads.save(lead) };
  }

  @Post(':id/crm/notes')
  async addNote(@Param('id') id: string, @Req() req: any, @Body() body: { text: string }) {
    const organizationId = await this.orgs.getForUser(req.user.sub, req.headers['x-organization-id']);
    await this.authorization.requirePermission(req.user.sub, organizationId, Permission.BUSINESS_WRITE);
    if (!body.text?.trim()) return { data: null };
    let lead = await this.leads.findOne({ where: { businessId: id, organizationId } });
    if (!lead) {
      const score = await this.scores.findOne({ where: { businessId: id }, order: { calculatedAt: 'DESC' } });
      lead = this.leads.create({ organizationId, businessId: id, score: score?.score ?? 0, grade: score?.grade, scoreReasons: score?.reasons ?? [], status: 'NEW', tags: [], notes: [], activities: [] });
    }
    const note = { id: randomUUID(), text: body.text.trim(), actorId: req.user.sub, createdAt: new Date().toISOString() };
    lead.notes = [...(lead.notes ?? []), note];
    this.addActivity(lead, 'NOTE_ADDED', req.user.sub, { noteId: note.id });
    lead.updatedAt = new Date();
    return { data: await this.leads.save(lead) };
  }

  private addActivity(lead: LeadEntity, type: string, actorId?: string, metadata?: Record<string, unknown>) {
    lead.activities = [...(lead.activities ?? []), { id: randomUUID(), type, actorId, metadata, createdAt: new Date().toISOString() }];
  }
}
