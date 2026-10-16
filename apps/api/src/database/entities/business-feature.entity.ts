import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('business_features')
export class BusinessFeatureEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() businessId!: string;
  @Column() feature!: string;
  @Column({ default: true }) value!: boolean;
  @Column({ type: 'double precision', default: 1 }) confidence!: number;
  @Column() source!: string;
  @Column({ type: 'timestamptz', default: () => 'now()' }) detectedAt!: Date;
}
