import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { LeadGrade } from '@lead/domain';
@Entity('lead_scores')
@Index(['score'])
export class LeadScoreEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() businessId!: string;
  @Column({ default: 0 }) score!: number;
  @Column({ type: 'enum', enum: LeadGrade }) grade!: LeadGrade;
  @Column({ type: 'jsonb', default: [] }) reasons!: unknown[];
  @Column({ type: 'timestamptz', default: () => 'now()' }) calculatedAt!: Date;
}
