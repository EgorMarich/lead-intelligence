import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('organization_usage')
@Index(['organizationId','periodStart'], { unique: true })
export class OrganizationUsageEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column({ type: 'date' }) periodStart!: string;
  @Column({ default: 0 }) searchesUsed!: number;
  @Column({ default: 0 }) exportsUsed!: number;
  @Column({ default: 0 }) businessesCreated!: number;
  @Column({ type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
