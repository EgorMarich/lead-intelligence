import { MigrationInterface, QueryRunner } from 'typeorm';

export class Billing1710000002000 implements MigrationInterface {
  name = 'Billing1710000002000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`DO $$ BEGIN CREATE TYPE "subscription_status_enum" AS ENUM ('PENDING','ACTIVE','PAST_DUE','CANCELED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await q.query(`DO $$ BEGIN CREATE TYPE "payment_status_enum" AS ENUM ('PENDING','SUCCEEDED','CANCELED','REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    await q.query(`CREATE TABLE IF NOT EXISTS "subscription_plans" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" varchar(32) NOT NULL UNIQUE, "name" varchar(100) NOT NULL, "priceRub" integer NOT NULL DEFAULT 0, "periodDays" integer NOT NULL DEFAULT 30, "searchesPerMonth" integer NOT NULL, "businessesLimit" integer NOT NULL, "membersLimit" integer NOT NULL, "exportsPerMonth" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true)`);
    await q.query(`CREATE TABLE IF NOT EXISTS "subscriptions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL, "planCode" varchar NOT NULL, "status" "subscription_status_enum" NOT NULL DEFAULT 'PENDING', "currentPeriodStart" timestamptz NOT NULL, "currentPeriodEnd" timestamptz NOT NULL, "canceledAt" timestamptz, "paymentMethodId" varchar, "autoRenew" boolean NOT NULL DEFAULT false, "provider" varchar, "providerCustomerId" varchar, "lastPaymentId" varchar, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_sub_org" ON "subscriptions" ("organizationId")`);
    await q.query(`CREATE TABLE IF NOT EXISTS "payments" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL, "subscriptionId" uuid NOT NULL, "planCode" varchar NOT NULL, "amountRub" integer NOT NULL, "currency" varchar(3) NOT NULL DEFAULT 'RUB', "providerPaymentId" varchar UNIQUE, "confirmationUrl" varchar, "status" "payment_status_enum" NOT NULL DEFAULT 'PENDING', "idempotencyKey" varchar, "providerPayload" jsonb, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE TABLE IF NOT EXISTS "organization_usage" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL, "periodStart" date NOT NULL, "searchesUsed" integer NOT NULL DEFAULT 0, "exportsUsed" integer NOT NULL DEFAULT 0, "businessesCreated" integer NOT NULL DEFAULT 0, "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_usage_period" UNIQUE ("organizationId","periodStart"))`);
    await q.query(`INSERT INTO "subscription_plans" ("code","name","priceRub","periodDays","searchesPerMonth","businessesLimit","membersLimit","exportsPerMonth") VALUES
      ('FREE','Free',0,36500,20,1000,2,1),
      ('STARTER','Starter',990,30,200,10000,5,10),
      ('BUSINESS','Business',2490,30,1000,50000,15,50),
      ('PRO','Pro',5990,30,5000,250000,50,200)
      ON CONFLICT ("code") DO UPDATE SET "name"=EXCLUDED."name", "priceRub"=EXCLUDED."priceRub", "periodDays"=EXCLUDED."periodDays", "searchesPerMonth"=EXCLUDED."searchesPerMonth", "businessesLimit"=EXCLUDED."businessesLimit", "membersLimit"=EXCLUDED."membersLimit", "exportsPerMonth"=EXCLUDED."exportsPerMonth"`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "organization_usage"`); await q.query(`DROP TABLE IF EXISTS "payments"`); await q.query(`DROP TABLE IF EXISTS "subscriptions"`); await q.query(`DROP TABLE IF EXISTS "subscription_plans"`); await q.query(`DROP TYPE IF EXISTS "payment_status_enum"`); await q.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
  }
}
