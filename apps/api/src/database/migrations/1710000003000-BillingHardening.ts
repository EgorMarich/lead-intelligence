import { MigrationInterface, QueryRunner } from 'typeorm';

export class BillingHardening1710000003000 implements MigrationInterface {
  name = 'BillingHardening1710000003000';

  async up(q: QueryRunner): Promise<void> {
    if (await q.hasTable('subscriptions')) {
      if (!(await q.hasColumn('subscriptions', 'gracePeriodEndsAt'))) {
        await q.query(`ALTER TABLE "subscriptions" ADD COLUMN "gracePeriodEndsAt" timestamptz`);
      }
      if (!(await q.hasColumn('subscriptions', 'renewalLockUntil'))) {
        await q.query(`ALTER TABLE "subscriptions" ADD COLUMN "renewalLockUntil" timestamptz`);
      }
      await q.query(`CREATE INDEX IF NOT EXISTS "IDX_sub_status_period" ON "subscriptions" ("status", "currentPeriodEnd")`);
    }

    if (await q.hasTable('payments')) {
      await q.query(`CREATE INDEX IF NOT EXISTS "IDX_pay_org_created" ON "payments" ("organizationId", "createdAt" DESC)`);
      await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_pay_org_idempotency" ON "payments" ("organizationId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`);
    }
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "UQ_pay_org_idempotency"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_pay_org_created"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_sub_status_period"`);
    if (await q.hasTable('subscriptions')) {
      if (await q.hasColumn('subscriptions', 'renewalLockUntil')) await q.query(`ALTER TABLE "subscriptions" DROP COLUMN "renewalLockUntil"`);
      if (await q.hasColumn('subscriptions', 'gracePeriodEndsAt')) await q.query(`ALTER TABLE "subscriptions" DROP COLUMN "gracePeriodEndsAt"`);
    }
  }
}
