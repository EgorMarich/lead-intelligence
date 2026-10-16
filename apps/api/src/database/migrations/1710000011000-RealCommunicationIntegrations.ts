import { MigrationInterface, QueryRunner } from 'typeorm';
export class RealCommunicationIntegrations1710000011000 implements MigrationInterface {
  name = 'RealCommunicationIntegrations1710000011000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb`);
    await q.query(`CREATE TABLE IF NOT EXISTS conversation_threads (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id uuid NOT NULL, business_id uuid NOT NULL, lead_id uuid NOT NULL, channel varchar NOT NULL, external_thread_id varchar, status varchar NOT NULL DEFAULT 'OPEN', last_message_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_conversation_threads_org_business_channel ON conversation_threads(organization_id,business_id,channel)`);
    await q.query(`CREATE TABLE IF NOT EXISTS communication_messages (id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), organization_id uuid NOT NULL, business_id uuid NOT NULL, lead_id uuid NOT NULL, thread_id uuid NOT NULL, channel varchar NOT NULL, direction varchar NOT NULL, provider_message_id varchar, sender varchar NOT NULL, recipient varchar NOT NULL, subject varchar, body text NOT NULL, status varchar NOT NULL DEFAULT 'RECEIVED', metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX IF NOT EXISTS idx_communication_messages_org_thread_created ON communication_messages(organization_id,thread_id,created_at)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_communication_messages_org_provider ON communication_messages(organization_id,provider_message_id) WHERE provider_message_id IS NOT NULL`);
  }
  async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE IF EXISTS communication_messages'); await q.query('DROP TABLE IF EXISTS conversation_threads'); }
}
