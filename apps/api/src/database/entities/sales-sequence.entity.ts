import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type SequenceStatus = 'DRAFT'|'ACTIVE'|'PAUSED'|'ARCHIVED';
export type SequenceAutomationMode = 'STATIC'|'AI_ADAPTIVE';
export type SequenceStepChannel = 'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP';
export interface SequenceStep { delayMinutes: number; channel: SequenceStepChannel; subject?: string; body: string; }

@Entity('sales_sequences')
@Index(['organizationId','status'])
export class SalesSequenceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() name!: string;
  @Column({type:'text',nullable:true}) description?: string;
  @Column({type:'enum',enum:['DRAFT','ACTIVE','PAUSED','ARCHIVED'],default:'DRAFT'}) status!: SequenceStatus;
  @Column({type:'jsonb',default:[]}) steps!: SequenceStep[];
  @Column({type:'enum',enum:['STATIC','AI_ADAPTIVE'],default:'STATIC'}) automationMode!: SequenceAutomationMode;
  @Column({default:true}) aiEnabled!: boolean;
  @Column({type:'jsonb',default:['EMAIL','TELEGRAM','VK','WHATSAPP']}) aiAllowedChannels!: SequenceStepChannel[];
  @Column({type:'float',default:0.62}) aiMinConfidence!: number;
  @Column({type:'int',default:1440}) aiDefaultDelayMinutes!: number;
  @Column({type:'int',default:10080}) aiMaxDelayMinutes!: number;
  @Column({default:true}) stopOnReply!: boolean;
  @Column({type:'jsonb',default:['INTERESTED','NEGOTIATION','CONVERTED','LOST']}) stopOnStatuses!: string[];
  @Column({type:'timestamptz',default:()=> 'now()'}) createdAt!: Date;
  @Column({type:'timestamptz',default:()=> 'now()'}) updatedAt!: Date;
}
