import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ContactType } from '@lead/domain';
@Entity('contacts')
@Index(['normalizedValue'])
export class ContactEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() businessId!: string;
  @Column({ type: 'enum', enum: ContactType }) type!: ContactType;
  @Column() value!: string;
  @Column({ nullable: true }) normalizedValue?: string;
  @Column({ default: false }) isPrimary!: boolean;
  @Column({ nullable: true }) sourceId?: string;
  @Column({ nullable: true, type: 'timestamptz' }) verifiedAt?: Date;
  @Column({ type: 'jsonb', default: {} }) metadata!: Record<string, unknown>;
}
