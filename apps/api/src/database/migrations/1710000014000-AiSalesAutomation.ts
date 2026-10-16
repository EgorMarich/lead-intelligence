import { MigrationInterface, QueryRunner } from 'typeorm';
export class AiSalesAutomation1710000014000 implements MigrationInterface {
 name='AiSalesAutomation1710000014000';
 async up(q:QueryRunner){
  await q.query(`ALTER TABLE "sales_sequences" ADD COLUMN "automationMode" varchar NOT NULL DEFAULT 'STATIC'`);
  await q.query(`ALTER TABLE "sales_sequences" ADD COLUMN "aiEnabled" boolean NOT NULL DEFAULT true`);
  await q.query(`ALTER TABLE "sales_sequences" ADD COLUMN "aiAllowedChannels" jsonb NOT NULL DEFAULT '["EMAIL","TELEGRAM","VK","WHATSAPP"]'`);
  await q.query(`ALTER TABLE "sales_sequences" ADD COLUMN "aiMinConfidence" double precision NOT NULL DEFAULT 0.62`);
  await q.query(`ALTER TABLE "sales_sequences" ADD COLUMN "aiDefaultDelayMinutes" integer NOT NULL DEFAULT 1440`);
  await q.query(`ALTER TABLE "sales_sequences" ADD COLUMN "aiMaxDelayMinutes" integer NOT NULL DEFAULT 10080`);
  await q.query(`CREATE TYPE "ai_sales_decisions_status_enum" AS ENUM ('GENERATED','QUEUED','SENT','SKIPPED','STOPPED','FAILED')`);
  await q.query(`CREATE TYPE "ai_sales_decisions_channel_enum" AS ENUM ('EMAIL','TELEGRAM','VK','WHATSAPP')`);
  await q.query(`CREATE TABLE "ai_sales_decisions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(),"organizationId" uuid NOT NULL,"enrollmentId" uuid NOT NULL,"businessId" uuid NOT NULL,"leadId" uuid NOT NULL,"stepIndex" integer NOT NULL,"channel" "ai_sales_decisions_channel_enum" NOT NULL,"subject" varchar,"body" text NOT NULL,"nextDelayMinutes" integer NOT NULL DEFAULT 1440,"recommendedAction" varchar NOT NULL DEFAULT 'FOLLOW_UP',"reason" text,"confidence" double precision NOT NULL DEFAULT 0.5,"provider" varchar NOT NULL DEFAULT 'heuristic',"status" "ai_sales_decisions_status_enum" NOT NULL DEFAULT 'GENERATED',"context" jsonb NOT NULL DEFAULT '{}',"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),CONSTRAINT "PK_ai_sales_decisions" PRIMARY KEY ("id"))`);
  await q.query(`CREATE INDEX "IDX_ai_sales_decisions_org_enrollment_step" ON "ai_sales_decisions" ("organizationId","enrollmentId","stepIndex")`);
 }
 async down(q:QueryRunner){await q.query(`DROP INDEX "IDX_ai_sales_decisions_org_enrollment_step"`);await q.query(`DROP TABLE "ai_sales_decisions"`);await q.query(`DROP TYPE "ai_sales_decisions_channel_enum"`);await q.query(`DROP TYPE "ai_sales_decisions_status_enum"`);await q.query(`ALTER TABLE "sales_sequences" DROP COLUMN "aiMaxDelayMinutes"`);await q.query(`ALTER TABLE "sales_sequences" DROP COLUMN "aiDefaultDelayMinutes"`);await q.query(`ALTER TABLE "sales_sequences" DROP COLUMN "aiMinConfidence"`);await q.query(`ALTER TABLE "sales_sequences" DROP COLUMN "aiAllowedChannels"`);await q.query(`ALTER TABLE "sales_sequences" DROP COLUMN "aiEnabled"`);await q.query(`ALTER TABLE "sales_sequences" DROP COLUMN "automationMode"`)}
}
