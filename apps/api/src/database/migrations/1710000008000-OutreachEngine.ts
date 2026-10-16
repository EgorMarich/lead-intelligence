import { MigrationInterface, QueryRunner } from 'typeorm';
export class OutreachEngine1710000008000 implements MigrationInterface {
  name = 'OutreachEngine1710000008000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE IF NOT EXISTS "outreach_templates" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL, "name" varchar NOT NULL, "channel" varchar NOT NULL, "subject" varchar, "body" text NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_outreach_templates" PRIMARY KEY ("id"))`);
    await q.query(`CREATE TABLE IF NOT EXISTS "outreach_messages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL, "businessId" uuid NOT NULL, "leadId" uuid NOT NULL, "channel" varchar NOT NULL, "contactId" uuid, "recipient" varchar NOT NULL, "subject" varchar, "body" text NOT NULL, "status" varchar NOT NULL DEFAULT 'DRAFT', "attempts" integer NOT NULL DEFAULT 0, "error" text, "metadata" jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now(), "sentAt" timestamptz, CONSTRAINT "PK_outreach_messages" PRIMARY KEY ("id"))`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_outreach_templates_org_channel" ON "outreach_templates" ("organizationId","channel")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_outreach_messages_org_status" ON "outreach_messages" ("organizationId","status")`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_outreach_messages_org_business_created" ON "outreach_messages" ("organizationId","businessId","createdAt")`);
  }
  async down(q: QueryRunner): Promise<void> { await q.query(`DROP TABLE IF EXISTS "outreach_messages"`); await q.query(`DROP TABLE IF EXISTS "outreach_templates"`); }
}
