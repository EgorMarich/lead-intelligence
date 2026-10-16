import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrawlPersistenceAndLeads1710000006000 implements MigrationInterface {
  name = 'CrawlPersistenceAndLeads1710000006000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE IF NOT EXISTS "crawl_jobs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL,
      "status" varchar NOT NULL DEFAULT 'QUEUED', "totalUrls" integer NOT NULL DEFAULT 0,
      "processedUrls" integer NOT NULL DEFAULT 0, "failedUrls" integer NOT NULL DEFAULT 0,
      "maxPagesPerSite" integer NOT NULL DEFAULT 3, "priority" integer NOT NULL DEFAULT 0,
      "startedAt" timestamptz, "completedAt" timestamptz, "error" text,
      "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE IF NOT EXISTS "crawl_job_urls" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "crawlJobId" uuid NOT NULL,
      "organizationId" uuid NOT NULL, "url" text NOT NULL, "normalizedUrl" text NOT NULL,
      "status" varchar NOT NULL DEFAULT 'QUEUED', "attempts" integer NOT NULL DEFAULT 0,
      "httpStatus" integer, "error" text, "startedAt" timestamptz, "completedAt" timestamptz)`);
    await q.query(`CREATE TABLE IF NOT EXISTS "crawl_results" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL,
      "crawlJobId" uuid NOT NULL, "crawlJobUrlId" uuid NOT NULL, "requestedUrl" text NOT NULL,
      "finalUrl" text NOT NULL, "normalizedUrl" text NOT NULL, "domain" varchar,
      "httpStatus" integer, "title" varchar, "description" text, "language" varchar,
      "ssl" boolean NOT NULL DEFAULT false, "technologies" jsonb NOT NULL DEFAULT '[]',
      "contacts" jsonb NOT NULL DEFAULT '{}', "signals" jsonb NOT NULL DEFAULT '{}',
      "links" jsonb NOT NULL DEFAULT '[]', "pages" integer NOT NULL DEFAULT 1, "error" text,
      "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE IF NOT EXISTS "website_analyses" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL,
      "websiteId" uuid NOT NULL, "crawlResultId" uuid NOT NULL, "language" varchar,
      "technologies" jsonb NOT NULL DEFAULT '[]', "contacts" jsonb NOT NULL DEFAULT '{}',
      "signals" jsonb NOT NULL DEFAULT '{}', "links" jsonb NOT NULL DEFAULT '[]',
      "ssl" boolean NOT NULL DEFAULT false, "analyzedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE IF NOT EXISTS "leads" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL,
      "businessId" uuid NOT NULL, "status" varchar NOT NULL DEFAULT 'NEW', "score" integer NOT NULL DEFAULT 0,
      "grade" varchar, "scoreReasons" jsonb NOT NULL DEFAULT '[]', "assigneeId" uuid,
      "tags" jsonb NOT NULL DEFAULT '[]', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_crawl_jobs_org_status" ON "crawl_jobs" ("organizationId","status")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_crawl_job_urls_job_status" ON "crawl_job_urls" ("crawlJobId","status")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_crawl_job_urls_org_url" ON "crawl_job_urls" ("organizationId","normalizedUrl")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_crawl_results_org_job" ON "crawl_results" ("organizationId","crawlJobId")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_crawl_results_org_url" ON "crawl_results" ("organizationId","normalizedUrl")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_website_analyses_org_website" ON "website_analyses" ("organizationId","websiteId","analyzedAt")`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_leads_org_business" ON "leads" ("organizationId","businessId")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_org_status" ON "leads" ("organizationId","status")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_org_score" ON "leads" ("organizationId","score")`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "website_analyses"`);
    await q.query(`DROP TABLE IF EXISTS "crawl_results"`);
    await q.query(`DROP TABLE IF EXISTS "crawl_job_urls"`);
    await q.query(`DROP TABLE IF EXISTS "crawl_jobs"`);
    await q.query(`DROP TABLE IF EXISTS "leads"`);
  }
}
