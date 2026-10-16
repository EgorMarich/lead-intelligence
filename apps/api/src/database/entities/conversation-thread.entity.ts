import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ConversationChannel = 'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP';

@Entity('conversation_threads')
@Index(['organizationId','businessId','channel'])
export class ConversationThreadEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() businessId!: string;
  @Column() leadId!: string;
  @Column({ type: 'enum', enum: ['EMAIL','TELEGRAM','VK','WHATSAPP'] }) channel!: ConversationChannel;
  @Column({ nullable: true }) externalThreadId?: string;
  @Column({ default: 'OPEN' }) status!: 'OPEN'|'CLOSED';
  @Column({ type: 'timestamptz', nullable: true }) lastMessageAt?: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
