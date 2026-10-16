import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('raw_leads')
@Index(['organizationId', 'searchJobId'])
@Index(['organizationId', 'source', 'externalId'], { unique: true })
export class RawLeadEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() searchJobId!: string;
  @Column() source!: string;
  @Column({ nullable: true }) externalId?: string;
  @Column() name!: string;
  @Column({ nullable: true }) category?: string;
  @Column({ nullable: true }) city?: string;
  @Column({ nullable: true, type: 'text' }) address?: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ nullable: true }) email?: string;
  @Column({ nullable: true }) website?: string;
  @Column({ nullable: true, type: 'double precision' }) rating?: number;
  @Column({ default: 0 }) reviewsCount!: number;
  @Column({ nullable: true, type: 'text' }) sourceUrl?: string;
  @Column({ type: 'jsonb', default: {} }) rawPayload!: Record<string, unknown>;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
