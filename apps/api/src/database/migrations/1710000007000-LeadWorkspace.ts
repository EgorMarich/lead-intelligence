import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadWorkspace1710000007000 implements MigrationInterface {
  name = 'LeadWorkspace1710000007000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "notes" jsonb NOT NULL DEFAULT '[]'`);
    await q.query(`ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "activities" jsonb NOT NULL DEFAULT '[]'`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_org_status_score" ON "leads" ("organizationId","status","score")`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS "IDX_leads_org_status_score"`);
    await q.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "activities"`);
    await q.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "notes"`);
  }
}
