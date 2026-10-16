import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type CommunicationDirection = 'INBOUND'|'OUTBOUND';
export type CommunicationStatus = 'RECEIVED'|'QUEUED'|'SENDING'|'SENT'|'FAILED';

@Entity('communication_messages')
@Index(['organizationId','threadId','createdAt'])
@Index(['organizationId','providerMessageId'], { unique: true })
export class CommunicationMessageEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() businessId!: string;
  @Column() leadId!: string;
  @Column() threadId!: string;
  @Column({ type: 'enum', enum: ['EMAIL','TELEGRAM','VK','WHATSAPP'] }) channel!: 'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP';
  @Column({ type: 'enum', enum: ['INBOUND','OUTBOUND'] }) direction!: CommunicationDirection;
  @Column({ nullable: true }) providerMessageId?: string;
  @Column() sender!: string;
  @Column() recipient!: string;
  @Column({ nullable: true }) subject?: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ type: 'enum', enum: ['RECEIVED','QUEUED','SENDING','SENT','FAILED'], default: 'RECEIVED' }) status!: CommunicationStatus;
  @Column({ type: 'jsonb', default: {} }) metadata!: Record<string, unknown>;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
