import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalyticsAndFunnel1710000009000 implements MigrationInterface {
  name = 'AnalyticsAndFunnel1710000009000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "dealValue" numeric(14,2) NOT NULL DEFAULT 0`);
    await q.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "revenue" numeric(14,2) NOT NULL DEFAULT 0`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_org_created_status" ON "leads" ("organizationId","createdAt","status")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_enrichment_jobs_org_created_status" ON "enrichment_jobs" ("organizationId","createdAt","status")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_outreach_messages_org_created_status" ON "outreach_messages" ("organizationId","createdAt","status")`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_outreach_messages_org_created_status"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_enrichment_jobs_org_created_status"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_leads_org_created_status"`);
    await q.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "revenue"`);
    await q.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "dealValue"`);
  }
}
