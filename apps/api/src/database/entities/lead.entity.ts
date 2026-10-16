import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PersistentLeadStatus = 'NEW'|'CONTACTED'|'INTERESTED'|'NEGOTIATION'|'CONVERTED'|'LOST';
export type LeadActivity = { id: string; type: string; text?: string; actorId?: string; metadata?: Record<string, unknown>; createdAt: string };

@Entity('leads')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'score'])
@Index(['organizationId', 'businessId'], { unique: true })
export class LeadEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() businessId!: string;
  @Column({ type: 'enum', enum: ['NEW','CONTACTED','INTERESTED','NEGOTIATION','CONVERTED','LOST'], default: 'NEW' }) status!: PersistentLeadStatus;
  @Column({ default: 0 }) score!: number;
  @Column({ type: 'varchar', nullable: true }) grade?: string;
  @Column({ type: 'jsonb', default: [] }) scoreReasons!: unknown[];
  @Column({ nullable: true }) assigneeId?: string;
  @Column({ type: 'jsonb', default: [] }) tags!: string[];
  @Column({ type: 'jsonb', default: [] }) notes!: Array<{ id: string; text: string; actorId?: string; createdAt: string }>;
  @Column({ type: 'jsonb', default: [] }) activities!: LeadActivity[];
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) dealValue!: number;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) revenue!: number;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
