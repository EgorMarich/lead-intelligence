import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type OutreachChannel = 'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP'|'INSTAGRAM'|'PHONE';
export type OutreachStatus = 'DRAFT'|'QUEUED'|'SENDING'|'SENT'|'FAILED'|'CANCELLED';

@Entity('outreach_messages')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'businessId', 'createdAt'])
export class OutreachMessageEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() businessId!: string;
  @Column() leadId!: string;
  @Column({ type: 'enum', enum: ['EMAIL','TELEGRAM','VK','WHATSAPP','INSTAGRAM','PHONE'] }) channel!: OutreachChannel;
  @Column({ nullable: true }) contactId?: string;
  @Column() recipient!: string;
  @Column({ nullable: true }) subject?: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ type: 'enum', enum: ['DRAFT','QUEUED','SENDING','SENT','FAILED','CANCELLED'], default: 'DRAFT' }) status!: OutreachStatus;
  @Column({ default: 0 }) attempts!: number;
  @Column({ nullable: true, type: 'text' }) error?: string;
  @Column({ type: 'jsonb', default: {} }) metadata!: Record<string, unknown>;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ nullable: true, type: 'timestamptz' }) sentAt?: Date;
}
