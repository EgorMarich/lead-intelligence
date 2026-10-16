import { MigrationInterface, QueryRunner } from 'typeorm';
export class RevenueGlobalization1710000015000 implements MigrationInterface {
 name='RevenueGlobalization1710000015000';
 async up(q:QueryRunner){await q.query(`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS language_code varchar(10) NOT NULL DEFAULT 'ru', ADD COLUMN IF NOT EXISTS currency_code varchar(3) NOT NULL DEFAULT 'RUB', ADD COLUMN IF NOT EXISTS timezone varchar(64) NOT NULL DEFAULT 'Europe/Moscow'`);}
 async down(q:QueryRunner){await q.query(`ALTER TABLE organizations DROP COLUMN IF EXISTS timezone, DROP COLUMN IF EXISTS currency_code, DROP COLUMN IF EXISTS language_code`);}
}
