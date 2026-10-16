import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('business_sources')
export class BusinessSourceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() businessId!: string;
  @Column() sourceId!: string;
  @Column({ nullable: true }) externalId?: string;
  @Column({ nullable: true }) sourceUrl?: string;
  @Column({ type: 'double precision', default: 1 }) confidence!: number;
  @Column({ type: 'timestamptz', default: () => 'now()' }) firstSeenAt!: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) lastSeenAt!: Date;
}
