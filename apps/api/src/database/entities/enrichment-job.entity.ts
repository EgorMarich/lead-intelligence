import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type EnrichmentJobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

@Entity('enrichment_jobs')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'businessId', 'createdAt'])
export class EnrichmentJobEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() businessId!: string;
  @Column({ type: 'enum', enum: ['QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED'], default: 'QUEUED' }) status!: EnrichmentJobStatus;
  @Column({ default: 0 }) attempts!: number;
  @Column({ nullable: true, type: 'text' }) error?: string;
  @Column({ type: 'jsonb', default: {} }) result!: Record<string, unknown>;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ nullable: true, type: 'timestamptz' }) startedAt?: Date;
  @Column({ nullable: true, type: 'timestamptz' }) finishedAt?: Date;
}
