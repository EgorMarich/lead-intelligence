import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { SubscriptionPlanEntity, PlanCode } from '../../database/entities/subscription-plan.entity';
import { SubscriptionEntity, SubscriptionStatus } from '../../database/entities/subscription.entity';
import { PaymentEntity, PaymentStatus } from '../../database/entities/payment.entity';
import { OrganizationUsageEntity } from '../../database/entities/usage.entity';
import { OrganizationMemberEntity, OrganizationRole } from '../../database/entities/organization-member.entity';
import { CurrentOrganizationService } from '../organizations/current-organization.service';
import { YooKassaClient } from './yookassa.client';

const DAY = 24 * 60 * 60 * 1000;
const GRACE_DAYS = 3;

type LimitKey = 'searchesPerMonth' | 'exportsPerMonth' | 'businessesLimit' | 'membersLimit';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(SubscriptionPlanEntity) private plans: Repository<SubscriptionPlanEntity>,
    @InjectRepository(SubscriptionEntity) private subscriptions: Repository<SubscriptionEntity>,
    @InjectRepository(PaymentEntity) private payments: Repository<PaymentEntity>,
    @InjectRepository(OrganizationUsageEntity) private usage: Repository<OrganizationUsageEntity>,
    @InjectRepository(OrganizationMemberEntity) private members: Repository<OrganizationMemberEntity>,
    private orgs: CurrentOrganizationService,
    private yoo: YooKassaClient,
    private dataSource: DataSource,
  ) {}

  async listPlans() {
    return { data: await this.plans.find({ where: { isActive: true }, order: { priceRub: 'ASC' } }) };
  }

  private async getPlan(code: string) {
    const plan = await this.plans.findOneBy({ code: code as PlanCode, isActive: true });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async ensureSubscription(organizationId: string) {
    let sub = await this.subscriptions.findOne({ where: { organizationId }, order: { createdAt: 'DESC' } });
    if (!sub) {
      const plan = await this.getPlan('FREE');
      const start = new Date();
      const end = new Date(start.getTime() + 36500 * DAY);
      sub = await this.subscriptions.save(this.subscriptions.create({
        organizationId, planCode: plan.code, status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: start, currentPeriodEnd: end, autoRenew: false, provider: 'internal',
      }));
    }
    return sub;
  }

  private periodStartDate() {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  private periodStart() { return this.periodStartDate().toISOString().slice(0, 10); }

  private async getUsage(organizationId: string, periodStart = this.periodStart()) {
    const existing = await this.usage.findOneBy({ organizationId, periodStart });
    if (existing) return existing;
    try {
      return await this.usage.save(this.usage.create({ organizationId, periodStart }));
    } catch {
      return this.usage.findOneByOrFail({ organizationId, periodStart });
    }
  }

  private async normalizeExpiredSubscription(sub: SubscriptionEntity) {
    const now = new Date();
    if (sub.planCode !== 'FREE' && sub.currentPeriodEnd <= now && sub.status === SubscriptionStatus.ACTIVE) {
      if (sub.autoRenew && sub.paymentMethodId) {
        sub.status = SubscriptionStatus.PAST_DUE;
        sub.gracePeriodEndsAt = new Date(sub.currentPeriodEnd.getTime() + GRACE_DAYS * DAY);
      } else {
        sub.status = SubscriptionStatus.EXPIRED;
      }
      sub.updatedAt = now;
      await this.subscriptions.save(sub);
    }
    if (sub.status === SubscriptionStatus.PAST_DUE && sub.gracePeriodEndsAt && sub.gracePeriodEndsAt <= now) {
      sub.status = SubscriptionStatus.EXPIRED;
      sub.autoRenew = false;
      sub.updatedAt = now;
      await this.subscriptions.save(sub);
    }
    return sub;
  }

  async current(userId: string, organizationIdHeader?: string) {
    const organizationId = await this.orgs.getForUser(userId, organizationIdHeader);
    const subscription = await this.normalizeExpiredSubscription(await this.ensureSubscription(organizationId));
    const plan = await this.getPlan(subscription.planCode);
    const usage = await this.getUsage(organizationId);
    const memberCount = await this.members.countBy({ organizationId });
    return { data: { subscription, plan, usage, memberCount } };
  }

  async history(userId: string, organizationIdHeader?: string, limit = 50) {
    const organizationId = await this.orgs.getForUser(userId, organizationIdHeader);
    const payments = await this.payments.find({ where: { organizationId }, order: { createdAt: 'DESC' }, take: Math.min(Math.max(limit, 1), 100) });
    return { data: payments };
  }

  async checkout(userId: string, planCode: string, returnUrl: string | undefined, organizationIdHeader: string | undefined, idempotencyKey: string) {
    const organizationId = await this.orgs.getForUser(userId, organizationIdHeader);
    const membership = await this.members.findOneBy({ userId, organizationId });
    if (!membership || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(membership.role)) throw new ForbiddenException('Only organization owner/admin can change subscription');
    if (!idempotencyKey) throw new BadRequestException('Idempotency-Key header is required');

    const previous = await this.payments.findOneBy({ organizationId, idempotencyKey });
    if (previous) return { data: { paymentId: previous.id, subscriptionId: previous.subscriptionId, status: previous.status, confirmationUrl: previous.confirmationUrl } };

    const plan = await this.getPlan(planCode);
    if (plan.code === 'FREE') throw new BadRequestException('Free plan does not require payment');

    const current = await this.normalizeExpiredSubscription(await this.ensureSubscription(organizationId));
    if (current.planCode === plan.code && current.status === SubscriptionStatus.ACTIVE && current.currentPeriodEnd > new Date()) {
      throw new ConflictException('This plan is already active');
    }

    const payment = await this.dataSource.transaction(async manager => {
      const subRepo = manager.getRepository(SubscriptionEntity);
      const payRepo = manager.getRepository(PaymentEntity);
      const start = new Date();
      const end = new Date(start.getTime() + plan.periodDays * DAY);
      const subscription = await subRepo.save(subRepo.create({
        organizationId, planCode: plan.code, status: SubscriptionStatus.PENDING,
        currentPeriodStart: start, currentPeriodEnd: end, autoRenew: false, provider: 'yookassa',
      }));
      return payRepo.save(payRepo.create({
        organizationId, subscriptionId: subscription.id, planCode: plan.code,
        amountRub: plan.priceRub, currency: 'RUB', status: PaymentStatus.PENDING, idempotencyKey,
      }));
    });

    try {
      const providerPayment = await this.yoo.createPayment({
        amountRub: plan.priceRub,
        description: `Подписка ${plan.name}`,
        returnUrl: returnUrl ?? process.env.BILLING_RETURN_URL,
        metadata: { paymentId: payment.id, subscriptionId: payment.subscriptionId, organizationId, planCode: plan.code },
        savePaymentMethod: true,
        idempotencyKey,
      });
      payment.providerPaymentId = providerPayment.id;
      payment.confirmationUrl = providerPayment.confirmation?.confirmation_url;
      payment.providerPayload = providerPayment as unknown as Record<string, unknown>;
      await this.payments.save(payment);
      return { data: { paymentId: payment.id, subscriptionId: payment.subscriptionId, status: payment.status, confirmationUrl: payment.confirmationUrl } };
    } catch (error) {
      payment.status = PaymentStatus.CANCELED;
      payment.providerPayload = { error: String(error) };
      await this.payments.save(payment);
      throw error;
    }
  }

  async handleWebhook(payload: any) {
    const providerPaymentId = payload?.object?.id;
    if (!providerPaymentId) return { received: true };
    const providerPayment = await this.yoo.getPayment(providerPaymentId);
    const metadata = providerPayment.metadata ?? {};
    const payment = await this.payments.findOneBy({ id: metadata.paymentId });
    if (!payment) return { received: true };
    if (payment.status === PaymentStatus.SUCCEEDED) return { received: true };

    await this.dataSource.transaction(async manager => {
      const payRepo = manager.getRepository(PaymentEntity);
      const subRepo = manager.getRepository(SubscriptionEntity);
      const lockedPayment = await payRepo.findOne({ where: { id: payment.id }, lock: { mode: 'pessimistic_write' } });
      if (!lockedPayment || lockedPayment.status === PaymentStatus.SUCCEEDED) return;
      lockedPayment.providerPaymentId = providerPayment.id;
      lockedPayment.providerPayload = providerPayment as unknown as Record<string, unknown>;
      if (providerPayment.status === 'succeeded') {
        lockedPayment.status = PaymentStatus.SUCCEEDED;
        const subscription = await subRepo.findOne({ where: { id: lockedPayment.subscriptionId }, lock: { mode: 'pessimistic_write' } });
        if (subscription) {
          const plan = await this.getPlan(lockedPayment.planCode);
          const start = new Date();
          subscription.status = SubscriptionStatus.ACTIVE;
          subscription.planCode = lockedPayment.planCode;
          subscription.currentPeriodStart = start;
          subscription.currentPeriodEnd = new Date(start.getTime() + plan.periodDays * DAY);
          subscription.lastPaymentId = providerPayment.id;
          subscription.paymentMethodId = providerPayment.payment_method?.id;
          subscription.autoRenew = Boolean(providerPayment.payment_method?.saved);
          subscription.gracePeriodEndsAt = undefined;
          subscription.renewalLockUntil = undefined;
          subscription.updatedAt = new Date();
          await subRepo.save(subscription);
        }
      } else if (providerPayment.status === 'canceled') {
        lockedPayment.status = PaymentStatus.CANCELED;
        const subscription = await subRepo.findOneBy({ id: lockedPayment.subscriptionId });
        if (subscription && subscription.status === SubscriptionStatus.PENDING) {
          subscription.status = SubscriptionStatus.CANCELED;
          subscription.updatedAt = new Date();
          await subRepo.save(subscription);
        }
      }
      await payRepo.save(lockedPayment);
    });
    return { received: true };
  }

  async cancel(userId: string, organizationIdHeader?: string) {
    const organizationId = await this.orgs.getForUser(userId, organizationIdHeader);
    const membership = await this.members.findOneBy({ userId, organizationId });
    if (!membership || ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(membership.role)) throw new ForbiddenException();
    const sub = await this.subscriptions.findOne({ where: { organizationId }, order: { createdAt: 'DESC' } });
    if (!sub || sub.planCode === 'FREE') return { data: sub };
    sub.autoRenew = false;
    sub.canceledAt = new Date();
    if (sub.currentPeriodEnd > new Date()) sub.status = SubscriptionStatus.ACTIVE;
    sub.updatedAt = new Date();
    await this.subscriptions.save(sub);
    return { data: sub };
  }

  async consumeSearch(userId: string, organizationIdHeader?: string) {
    return this.consumeCounter(userId, organizationIdHeader, 'searchesPerMonth', 'searchesUsed');
  }

  async consumeExport(userId: string, organizationIdHeader?: string) {
    return this.consumeCounter(userId, organizationIdHeader, 'exportsPerMonth', 'exportsUsed');
  }

  async consumeBusiness(userId: string, organizationIdHeader?: string) {
    return this.consumeCounter(userId, organizationIdHeader, 'businessesLimit', 'businessesCreated');
  }

  private async consumeCounter(userId: string, organizationIdHeader: string | undefined, planKey: LimitKey, usageKey: 'searchesUsed'|'exportsUsed'|'businessesCreated') {
    const organizationId = await this.orgs.getForUser(userId, organizationIdHeader);
    const sub = await this.normalizeExpiredSubscription(await this.ensureSubscription(organizationId));
    if (sub.status !== SubscriptionStatus.ACTIVE) throw new ForbiddenException('Subscription is not active');
    const plan = await this.getPlan(sub.planCode);
    const usage = await this.getUsage(organizationId);
    const limit = plan[planKey];
    if (usageKey === 'businessesCreated') {
      if (usage[usageKey] >= limit) throw new ForbiddenException(`Business limit reached (${limit})`);
    } else if (usage[usageKey] >= limit) {
      throw new ForbiddenException(`Monthly ${usageKey === 'searchesUsed' ? 'search' : 'export'} limit reached (${limit})`);
    }
    usage[usageKey] += 1;
    usage.updatedAt = new Date();
    await this.usage.save(usage);
    return { organizationId, plan };
  }

  async assertMembersLimit(organizationId: string) {
    const sub = await this.normalizeExpiredSubscription(await this.ensureSubscription(organizationId));
    const plan = await this.getPlan(sub.planCode);
    const count = await this.members.countBy({ organizationId });
    if (count >= plan.membersLimit) throw new ForbiddenException(`Member limit reached (${plan.membersLimit})`);
    return { organizationId, plan };
  }

  async processRenewals() {
    const now = new Date();
    const candidates = await this.subscriptions.createQueryBuilder('s')
      .where('s.autoRenew = true')
      .andWhere('s.paymentMethodId IS NOT NULL')
      .andWhere('s.currentPeriodEnd <= :now', { now })
      .andWhere('(s.renewalLockUntil IS NULL OR s.renewalLockUntil < :now)', { now })
      .andWhere('s.status IN (:...statuses)', { statuses: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] })
      .take(50)
      .getMany();

    let processed = 0;
    for (const candidate of candidates) {
      const locked = await this.subscriptions
        .createQueryBuilder()
        .update(SubscriptionEntity)
        .set({ renewalLockUntil: new Date(now.getTime() + 10 * 60 * 1000), status: SubscriptionStatus.PAST_DUE, updatedAt: now })
        .where('id = :id', { id: candidate.id })
        .andWhere('(renewalLockUntil IS NULL OR renewalLockUntil < :now)', { now })
        .execute();
      if (!locked.affected) continue;

      try {
        const plan = await this.getPlan(candidate.planCode);
        const key = `renewal:${candidate.id}:${candidate.currentPeriodEnd.toISOString()}`;
        const payment = await this.payments.save(this.payments.create({
          organizationId: candidate.organizationId,
          subscriptionId: candidate.id,
          planCode: candidate.planCode,
          amountRub: plan.priceRub,
          currency: 'RUB',
          status: PaymentStatus.PENDING,
          idempotencyKey: key,
        }));
        const providerPayment = await this.yoo.createPayment({
          amountRub: plan.priceRub,
          description: `Продление подписки ${plan.name}`,
          metadata: { paymentId: payment.id, subscriptionId: candidate.id, organizationId: candidate.organizationId, planCode: candidate.planCode, kind: 'renewal' },
          paymentMethodId: candidate.paymentMethodId,
          idempotencyKey: key,
        });
        payment.providerPaymentId = providerPayment.id;
        payment.providerPayload = providerPayment as unknown as Record<string, unknown>;
        await this.payments.save(payment);
        processed++;
      } catch {
        const sub = await this.subscriptions.findOneBy({ id: candidate.id });
        if (sub) {
          sub.status = SubscriptionStatus.PAST_DUE;
          sub.gracePeriodEndsAt ??= new Date(candidate.currentPeriodEnd.getTime() + GRACE_DAYS * DAY);
          sub.renewalLockUntil = undefined;
          sub.updatedAt = new Date();
          await this.subscriptions.save(sub);
        }
      }
    }
    return { processed };
  }
}
