import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeadDiscoveryEngine1710000005000 implements MigrationInterface {
  name = 'LeadDiscoveryEngine1710000005000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "search_jobs" ADD COLUMN IF NOT EXISTS "query" varchar`);
    await q.query(`ALTER TABLE "search_jobs" ADD COLUMN IF NOT EXISTS "filters" jsonb NOT NULL DEFAULT '{}'`);
    await q.query(`ALTER TABLE "search_jobs" ADD COLUMN IF NOT EXISTS "limit" integer NOT NULL DEFAULT 100`);
    await q.query(`ALTER TABLE "search_jobs" ADD COLUMN IF NOT EXISTS "createdAt" timestamptz NOT NULL DEFAULT now()`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_search_jobs_org_status" ON "search_jobs" ("organizationId", "status")`);
    await q.query(`CREATE TABLE IF NOT EXISTS "raw_leads" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL,
      "searchJobId" uuid NOT NULL,
      "source" varchar NOT NULL,
      "externalId" varchar,
      "name" varchar NOT NULL,
      "category" varchar,
      "city" varchar,
      "address" text,
      "phone" varchar,
      "email" varchar,
      "website" varchar,
      "rating" double precision,
      "reviewsCount" integer NOT NULL DEFAULT 0,
      "sourceUrl" text,
      "rawPayload" jsonb NOT NULL DEFAULT '{}',
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_raw_leads_org_job" ON "raw_leads" ("organizationId", "searchJobId")`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_raw_leads_org_source_external" ON "raw_leads" ("organizationId", "source", "externalId") WHERE "externalId" IS NOT NULL`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "raw_leads"`);
    await q.query(`ALTER TABLE "search_jobs" DROP COLUMN IF EXISTS "createdAt"`);
    await q.query(`ALTER TABLE "search_jobs" DROP COLUMN IF EXISTS "limit"`);
    await q.query(`ALTER TABLE "search_jobs" DROP COLUMN IF EXISTS "filters"`);
    await q.query(`ALTER TABLE "search_jobs" DROP COLUMN IF EXISTS "query"`);
  }
}
