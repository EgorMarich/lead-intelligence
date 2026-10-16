import { MigrationInterface, QueryRunner } from 'typeorm';
export class AiSalesIntelligence1710000010000 implements MigrationInterface {
  name = 'AiSalesIntelligence1710000010000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE IF NOT EXISTS "ai_insights" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" character varying NOT NULL, "businessId" character varying NOT NULL, "payload" jsonb NOT NULL, "provider" character varying NOT NULL DEFAULT 'heuristic', "model" character varying NOT NULL DEFAULT 'lead-intelligence-v1', "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_insights_id" PRIMARY KEY ("id"))`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ai_insights_org_business" ON "ai_insights" ("organizationId","businessId")`);
  }
  async down(q: QueryRunner): Promise<void> { await q.query(`DROP INDEX IF EXISTS "IDX_ai_insights_org_business"`); await q.query(`DROP TABLE IF EXISTS "ai_insights"`); }
}
