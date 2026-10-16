import { MigrationInterface, QueryRunner } from 'typeorm';
export class TenantIsolation1710000003000 implements MigrationInterface {
  name='TenantIsolation1710000003000';
  async up(q:QueryRunner):Promise<void>{
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_businesses_organization" ON "businesses" ("organizationId")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_search_jobs_organization" ON "search_jobs" ("organizationId")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_org_members_user_org" ON "organization_members" ("userId","organizationId")`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_org_member_user_org" ON "organization_members" ("userId","organizationId")`);
  }
  async down(q:QueryRunner):Promise<void>{
    await q.query(`DROP INDEX IF EXISTS "UQ_org_member_user_org"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_org_members_user_org"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_search_jobs_organization"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_businesses_organization"`);
  }
}
