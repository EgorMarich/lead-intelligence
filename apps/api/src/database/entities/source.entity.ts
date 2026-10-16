import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('sources')
export class SourceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) type!: string;
  @Column({ nullable: true }) externalId?: string;
  @Column({ nullable: true }) url?: string;
  @Column({ type: 'timestamptz', default: () => 'now()' }) firstSeenAt!: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) lastSeenAt!: Date;
  @Column({ type: 'jsonb', nullable: true }) rawData?: Record<string, unknown>;
}
