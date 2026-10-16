import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('crawl_results')
@Index(['organizationId', 'crawlJobId'])
@Index(['organizationId', 'normalizedUrl'])
export class CrawlResultEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() crawlJobId!: string;
  @Column() crawlJobUrlId!: string;
  @Column('text') requestedUrl!: string;
  @Column('text') finalUrl!: string;
  @Column('text') normalizedUrl!: string;
  @Column({ nullable: true }) domain?: string;
  @Column({ nullable: true, type: 'integer' }) httpStatus?: number;
  @Column({ nullable: true }) title?: string;
  @Column({ nullable: true, type: 'text' }) description?: string;
  @Column({ nullable: true }) language?: string;
  @Column({ default: false }) ssl!: boolean;
  @Column({ type: 'jsonb', default: [] }) technologies!: string[];
  @Column({ type: 'jsonb', default: {} }) contacts!: Record<string, unknown>;
  @Column({ type: 'jsonb', default: {} }) signals!: Record<string, boolean>;
  @Column({ type: 'jsonb', default: [] }) links!: string[];
  @Column({ type: 'integer', default: 1 }) pages!: number;
  @Column({ type: 'text', nullable: true }) error?: string;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
