import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BusinessStatus } from '@lead/domain';
@Entity('businesses')
@Index(['cityId', 'categoryId'])
export class BusinessEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() name!: string;
  @Column({ nullable: true }) legalName?: string;
  @Column({ nullable: true, type: 'text' }) description?: string;
  @Column({ length: 2, default: 'RU' }) countryCode!: string;
  @Column({ nullable: true }) region?: string;
  @Column() city!: string;
  @Column({ nullable: true }) address?: string;
  @Column({ nullable: true }) postalCode?: string;
  @Column({ nullable: true, type: 'double precision' }) latitude?: number;
  @Column({ nullable: true, type: 'double precision' }) longitude?: number;
  @Column({ nullable: true }) website?: string;
  @Column({ nullable: true, type: 'double precision' }) rating?: number;
  @Column({ default: 0 }) reviewsCount!: number;
  @Column({ nullable: true }) employeeCount?: number;
  @Column({ nullable: true }) cityId?: string;
  @Column({ nullable: true }) categoryId?: string;
  @Column({ type: 'enum', enum: BusinessStatus, default: BusinessStatus.UNKNOWN }) status!: BusinessStatus;
  @Column({ type: 'varchar', default: 'PENDING' }) enrichmentStatus!: 'PENDING'|'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED';
  @Column({ nullable: true, type: 'timestamptz' }) enrichedAt?: Date;
  @Column({ nullable: true, type: 'text' }) enrichmentError?: string;
  @Column({ default: 1 }) enrichmentVersion!: number;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
