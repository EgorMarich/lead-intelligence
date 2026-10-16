import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('website_analyses')
@Index(['organizationId', 'websiteId', 'analyzedAt'])
export class WebsiteAnalysisEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() websiteId!: string;
  @Column() crawlResultId!: string;
  @Column({ nullable: true }) language?: string;
  @Column({ type: 'jsonb', default: [] }) technologies!: string[];
  @Column({ type: 'jsonb', default: {} }) contacts!: Record<string, unknown>;
  @Column({ type: 'jsonb', default: {} }) signals!: Record<string, boolean>;
  @Column({ type: 'jsonb', default: [] }) links!: string[];
  @Column({ default: false }) ssl!: boolean;
  @Column({ type: 'timestamptz', default: () => 'now()' }) analyzedAt!: Date;
}
