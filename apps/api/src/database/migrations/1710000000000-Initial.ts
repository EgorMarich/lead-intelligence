import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1710000000000 implements MigrationInterface {
  name = 'Initial1710000000000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await q.query(`CREATE TYPE "business_status_enum" AS ENUM ('ACTIVE','INACTIVE','CLOSED','UNKNOWN')`);
    await q.query(`CREATE TYPE "job_status_enum" AS ENUM ('PENDING','RUNNING','COMPLETED','FAILED','CANCELLED')`);
    await q.query(`CREATE TYPE "lead_grade_enum" AS ENUM ('HOT','WARM','COLD','LOW')`);
    await q.query(`CREATE TYPE "contact_type_enum" AS ENUM ('PHONE','EMAIL','TELEGRAM','VK','WHATSAPP','INSTAGRAM','OTHER')`);

    await q.query(`CREATE TABLE "cities" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL UNIQUE,
      "countryCode" varchar(2) NOT NULL,
      "region" varchar,
      "latitude" double precision,
      "longitude" double precision,
      "timezone" varchar NOT NULL DEFAULT 'Europe/Moscow',
      "isActive" boolean NOT NULL DEFAULT true
    )`);
    await q.query(`CREATE TABLE "categories" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "code" varchar NOT NULL UNIQUE,
      "name" varchar NOT NULL,
      "parentCategoryId" uuid,
      "isActive" boolean NOT NULL DEFAULT true
    )`);
    await q.query(`CREATE TABLE "businesses" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar NOT NULL,
      "legalName" varchar,
      "description" text,
      "countryCode" varchar(2) NOT NULL DEFAULT 'RU',
      "region" varchar,
      "city" varchar NOT NULL,
      "address" varchar,
      "postalCode" varchar,
      "latitude" double precision,
      "longitude" double precision,
      "website" varchar,
      "rating" double precision,
      "reviewsCount" integer NOT NULL DEFAULT 0,
      "employeeCount" integer,
      "cityId" uuid,
      "categoryId" uuid,
      "status" "business_status_enum" NOT NULL DEFAULT 'UNKNOWN',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "IDX_business_city_category" ON "businesses" ("cityId","categoryId")`);

    await q.query(`CREATE TABLE "contacts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "businessId" uuid NOT NULL,
      "type" "contact_type_enum" NOT NULL,
      "value" varchar NOT NULL,
      "normalizedValue" varchar,
      "isPrimary" boolean NOT NULL DEFAULT false,
      "sourceId" uuid,
      "verifiedAt" timestamptz
    )`);
    await q.query(`CREATE INDEX "IDX_contacts_normalized" ON "contacts" ("normalizedValue")`);

    await q.query(`CREATE TABLE "websites" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "businessId" uuid NOT NULL,
      "url" varchar NOT NULL,
      "normalizedUrl" varchar NOT NULL UNIQUE,
      "domain" varchar NOT NULL,
      "isActive" boolean NOT NULL DEFAULT true,
      "httpStatus" integer,
      "title" varchar,
      "description" text,
      "lastCheckedAt" timestamptz
    )`);

    await q.query(`CREATE TABLE "sources" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "type" varchar NOT NULL UNIQUE,
      "externalId" varchar,
      "url" varchar,
      "firstSeenAt" timestamptz NOT NULL DEFAULT now(),
      "lastSeenAt" timestamptz NOT NULL DEFAULT now(),
      "rawData" jsonb
    )`);

    await q.query(`CREATE TABLE "business_sources" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "businessId" uuid NOT NULL,
      "sourceId" uuid NOT NULL,
      "externalId" varchar,
      "sourceUrl" varchar,
      "confidence" double precision NOT NULL DEFAULT 1,
      "firstSeenAt" timestamptz NOT NULL DEFAULT now(),
      "lastSeenAt" timestamptz NOT NULL DEFAULT now()
    )`);

    await q.query(`CREATE TABLE "business_features" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "businessId" uuid NOT NULL,
      "feature" varchar NOT NULL,
      "value" boolean NOT NULL DEFAULT true,
      "confidence" double precision NOT NULL DEFAULT 1,
      "source" varchar NOT NULL,
      "detectedAt" timestamptz NOT NULL DEFAULT now()
    )`);

    await q.query(`CREATE TABLE "lead_scores" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "businessId" uuid NOT NULL,
      "score" integer NOT NULL DEFAULT 0,
      "grade" "lead_grade_enum" NOT NULL,
      "reasons" jsonb NOT NULL DEFAULT '[]',
      "calculatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "IDX_lead_scores_score" ON "lead_scores" ("score")`);

    await q.query(`CREATE TABLE "search_jobs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "source" varchar NOT NULL,
      "cityId" uuid NOT NULL,
      "categoryId" uuid NOT NULL,
      "status" "job_status_enum" NOT NULL DEFAULT 'PENDING',
      "totalFound" integer NOT NULL DEFAULT 0,
      "processed" integer NOT NULL DEFAULT 0,
      "errors" integer NOT NULL DEFAULT 0,
      "startedAt" timestamptz,
      "finishedAt" timestamptz,
      "error" text
    )`);
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of ['search_jobs','lead_scores','business_features','business_sources','sources','websites','contacts','businesses','categories','cities']) {
      await q.query(`DROP TABLE IF EXISTS "${table}"`);
    }
    for (const type of ['contact_type_enum','lead_grade_enum','job_status_enum','business_status_enum']) {
      await q.query(`DROP TYPE IF EXISTS "${type}"`);
    }
  }
}
