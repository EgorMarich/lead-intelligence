import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PersistedCrawlJobStatus = 'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'|'CANCELLED';

@Entity('crawl_jobs')
@Index(['organizationId', 'status'])
export class CrawlJobEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column({ type: 'enum', enum: ['QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED'] }) status!: PersistedCrawlJobStatus;
  @Column({ default: 0 }) totalUrls!: number;
  @Column({ default: 0 }) processedUrls!: number;
  @Column({ default: 0 }) failedUrls!: number;
  @Column({ default: 3 }) maxPagesPerSite!: number;
  @Column({ default: 0 }) priority!: number;
  @Column({ nullable: true, type: 'timestamptz' }) startedAt?: Date;
  @Column({ nullable: true, type: 'timestamptz' }) completedAt?: Date;
  @Column({ nullable: true, type: 'text' }) error?: string;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
