import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutomaticEnrichment1710000008000 implements MigrationInterface {
  name = 'AutomaticEnrichment1710000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "enrichmentStatus" varchar NOT NULL DEFAULT 'PENDING'`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "enrichedAt" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "enrichmentError" text`);
    await queryRunner.query(`ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "enrichmentVersion" integer NOT NULL DEFAULT 1`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "enrichment_jobs" ("id" uuid NOT NULL, "organizationId" uuid NOT NULL, "businessId" uuid NOT NULL, "status" varchar NOT NULL DEFAULT 'QUEUED', "attempts" integer NOT NULL DEFAULT 0, "error" text, "result" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "startedAt" TIMESTAMPTZ, "finishedAt" TIMESTAMPTZ, CONSTRAINT "PK_enrichment_jobs_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_enrichment_jobs_org_status" ON "enrichment_jobs" ("organizationId", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_enrichment_jobs_org_business_created" ON "enrichment_jobs" ("organizationId", "businessId", "createdAt")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrichment_jobs_org_business_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrichment_jobs_org_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enrichment_jobs"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "enrichmentVersion"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "enrichmentError"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "enrichedAt"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "enrichmentStatus"`);
  }
}
