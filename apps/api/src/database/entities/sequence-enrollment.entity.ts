import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type EnrollmentStatus = 'ACTIVE'|'PAUSED'|'COMPLETED'|'STOPPED'|'FAILED';
@Entity('sequence_enrollments')
@Index(['organizationId','status'])
@Index(['organizationId','leadId','status'])
export class SequenceEnrollmentEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() sequenceId!: string;
  @Column() businessId!: string;
  @Column() leadId!: string;
  @Column({type:'enum',enum:['ACTIVE','PAUSED','COMPLETED','STOPPED','FAILED'],default:'ACTIVE'}) status!: EnrollmentStatus;
  @Column({default:0}) currentStep!: number;
  @Column({type:'timestamptz',nullable:true}) nextRunAt?: Date;
  @Column({type:'text',nullable:true}) stopReason?: string;
  @Column({type:'timestamptz',nullable:true}) completedAt?: Date;
  @Column({type:'timestamptz',default:()=> 'now()'}) createdAt!: Date;
  @Column({type:'timestamptz',default:()=> 'now()'}) updatedAt!: Date;
}
