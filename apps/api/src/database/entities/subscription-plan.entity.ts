import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

export enum PlanCode { FREE='FREE', STARTER='STARTER', BUSINESS='BUSINESS', PRO='PRO' }

@Entity('subscription_plans')
@Index(['code'], { unique: true })
export class SubscriptionPlanEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 32 }) code!: PlanCode;
  @Column({ type: 'varchar', length: 100 }) name!: string;
  @Column({ type: 'integer', default: 0 }) priceRub!: number;
  @Column({ type: 'integer', default: 30 }) periodDays!: number;
  @Column({ type: 'integer' }) searchesPerMonth!: number;
  @Column({ type: 'integer' }) businessesLimit!: number;
  @Column({ type: 'integer' }) membersLimit!: number;
  @Column({ type: 'integer' }) exportsPerMonth!: number;
  @Column({ default: true }) isActive!: boolean;
}
