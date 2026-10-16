import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
@Entity('websites')
@Index(['normalizedUrl'], { unique: true })
export class WebsiteEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() businessId!: string;
  @Column() url!: string;
  @Column() normalizedUrl!: string;
  @Column() domain!: string;
  @Column({ default: true }) isActive!: boolean;
  @Column({ nullable: true }) httpStatus?: number;
  @Column({ nullable: true }) title?: string;
  @Column({ nullable: true, type: 'text' }) description?: string;
  @Column({ nullable: true, type: 'timestamptz' }) lastCheckedAt?: Date;
}
