import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PersistedCrawlUrlStatus = 'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'|'CANCELLED';

@Entity('crawl_job_urls')
@Index(['crawlJobId', 'status'])
@Index(['organizationId', 'normalizedUrl'])
export class CrawlJobUrlEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() crawlJobId!: string;
  @Column() organizationId!: string;
  @Column('text') url!: string;
  @Column('text') normalizedUrl!: string;
  @Column({ type: 'enum', enum: ['QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED'] }) status!: PersistedCrawlUrlStatus;
  @Column({ default: 0 }) attempts!: number;
  @Column({ nullable: true, type: 'integer' }) httpStatus?: number;
  @Column({ nullable: true, type: 'text' }) error?: string;
  @Column({ nullable: true, type: 'timestamptz' }) startedAt?: Date;
  @Column({ nullable: true, type: 'timestamptz' }) completedAt?: Date;
}
