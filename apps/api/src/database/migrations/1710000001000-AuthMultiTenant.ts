import { MigrationInterface, QueryRunner } from 'typeorm';
export class AuthMultiTenant1710000001000 implements MigrationInterface {
 name='AuthMultiTenant1710000001000';
 async up(q:QueryRunner):Promise<void>{
  await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  await q.query(`DO $$ BEGIN CREATE TYPE "user_status_enum" AS ENUM ('ACTIVE','BLOCKED','PENDING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  await q.query(`DO $$ BEGIN CREATE TYPE "organization_role_enum" AS ENUM ('OWNER','ADMIN','MANAGER','ANALYST','VIEWER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  await q.query(`CREATE TABLE IF NOT EXISTS "users" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"email" varchar NOT NULL UNIQUE,"passwordHash" varchar NOT NULL,"name" varchar,"status" "user_status_enum" NOT NULL DEFAULT 'ACTIVE',"emailVerified" boolean NOT NULL DEFAULT false,"lastLoginAt" timestamptz,"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now())`);
  await q.query(`CREATE TABLE IF NOT EXISTS "organizations" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"name" varchar NOT NULL,"slug" varchar UNIQUE,"countryCode" varchar(2) NOT NULL DEFAULT 'RU',"isActive" boolean NOT NULL DEFAULT true,"createdAt" timestamptz NOT NULL DEFAULT now(),"updatedAt" timestamptz NOT NULL DEFAULT now())`);
  await q.query(`CREATE TABLE IF NOT EXISTS "organization_members" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"organizationId" uuid NOT NULL,"userId" uuid NOT NULL,"role" "organization_role_enum" NOT NULL DEFAULT 'VIEWER',"createdAt" timestamptz NOT NULL DEFAULT now(),CONSTRAINT "UQ_org_member" UNIQUE ("organizationId","userId"))`);
  await q.query(`CREATE INDEX IF NOT EXISTS "IDX_org_member_user" ON "organization_members" ("userId")`);
  await q.query(`CREATE TABLE IF NOT EXISTS "refresh_tokens" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),"userId" uuid NOT NULL,"tokenHash" varchar NOT NULL UNIQUE,"expiresAt" timestamptz NOT NULL,"revokedAt" timestamptz,"userAgent" varchar,"ipAddress" varchar,"createdAt" timestamptz NOT NULL DEFAULT now())`);
  if(await q.hasTable('businesses') && !(await q.hasColumn('businesses','organizationId'))) await q.query(`ALTER TABLE "businesses" ADD COLUMN "organizationId" uuid`);
  if(await q.hasTable('search_jobs') && !(await q.hasColumn('search_jobs','organizationId'))) await q.query(`ALTER TABLE "search_jobs" ADD COLUMN "organizationId" uuid`);
 }
 async down(q:QueryRunner):Promise<void>{ await q.query(`DROP TABLE IF EXISTS "refresh_tokens"`); await q.query(`DROP TABLE IF EXISTS "organization_members"`); await q.query(`DROP TABLE IF EXISTS "organizations"`); await q.query(`DROP TABLE IF EXISTS "users"`); await q.query(`DROP TYPE IF EXISTS "organization_role_enum"`); await q.query(`DROP TYPE IF EXISTS "user_status_enum"`); }
}
