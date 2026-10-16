import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AiSalesDecisionStatus = 'GENERATED'|'QUEUED'|'SENT'|'SKIPPED'|'STOPPED'|'FAILED';

@Entity('ai_sales_decisions')
@Index(['organizationId','enrollmentId','stepIndex'])
export class AiSalesDecisionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() enrollmentId!: string;
  @Column() businessId!: string;
  @Column() leadId!: string;
  @Column() stepIndex!: number;
  @Column({ type:'enum', enum:['EMAIL','TELEGRAM','VK','WHATSAPP'] }) channel!: 'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP';
  @Column({ nullable:true }) subject?: string;
  @Column({ type:'text' }) body!: string;
  @Column({ type:'int', default:1440 }) nextDelayMinutes!: number;
  @Column({ type:'varchar', default:'FOLLOW_UP' }) recommendedAction!: string;
  @Column({ type:'text', nullable:true }) reason?: string;
  @Column({ type:'float', default:0.5 }) confidence!: number;
  @Column({ type:'varchar', default:'heuristic' }) provider!: string;
  @Column({ type:'enum', enum:['GENERATED','QUEUED','SENT','SKIPPED','STOPPED','FAILED'], default:'GENERATED' }) status!: AiSalesDecisionStatus;
  @Column({ type:'jsonb', default:{} }) context!: Record<string, unknown>;
  @Column({ type:'timestamptz', default:()=> 'now()' }) createdAt!: Date;
}
