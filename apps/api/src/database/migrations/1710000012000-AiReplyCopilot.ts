import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiReplyCopilot1710000012000 implements MigrationInterface {
  name = 'AiReplyCopilot1710000012000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "ai_reply_suggestions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" character varying NOT NULL, "businessId" character varying NOT NULL, "leadId" character varying NOT NULL, "messageId" character varying NOT NULL, "channel" "public"."communication_messages_channel_enum" NOT NULL, "suggestion" text NOT NULL, "subject" character varying, "analysis" jsonb NOT NULL DEFAULT '{}', "status" character varying NOT NULL DEFAULT 'SUGGESTED', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ai_reply_suggestions" PRIMARY KEY ("id"));`);
    await queryRunner.query(`CREATE INDEX "IDX_ai_reply_suggestions_org_business_created" ON "ai_reply_suggestions" ("organizationId", "businessId", "createdAt");`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_ai_reply_suggestions_org_business_created"`);
    await queryRunner.query(`DROP TABLE "ai_reply_suggestions"`);
  }
}
