import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { JobStatus } from '@lead/domain';

@Entity('search_jobs')
@Index(['organizationId', 'status'])
export class SearchJobEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() source!: string;
  @Column({ nullable: true }) query?: string;
  @Column({ nullable: true }) cityId?: string;
  @Column({ nullable: true }) categoryId?: string;
  @Column({ type: 'jsonb', default: {} }) filters!: Record<string, unknown>;
  @Column({ default: 100 }) limit!: number;
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.PENDING }) status!: JobStatus;
  @Column({ default: 0 }) totalFound!: number;
  @Column({ default: 0 }) processed!: number;
  @Column({ default: 0 }) errors!: number;
  @Column({ nullable: true, type: 'timestamptz' }) startedAt?: Date;
  @Column({ nullable: true, type: 'timestamptz' }) finishedAt?: Date;
  @Column({ nullable: true, type: 'text' }) error?: string;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
