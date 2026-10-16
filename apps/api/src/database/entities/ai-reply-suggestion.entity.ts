import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_reply_suggestions')
@Index(['organizationId','businessId','createdAt'])
export class AiReplySuggestionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() businessId!: string;
  @Column() leadId!: string;
  @Column() messageId!: string;
  @Column({ type: 'enum', enum: ['EMAIL','TELEGRAM','VK','WHATSAPP'] }) channel!: 'EMAIL'|'TELEGRAM'|'VK'|'WHATSAPP';
  @Column({ type: 'text' }) suggestion!: string;
  @Column({ type: 'text', nullable: true }) subject?: string;
  @Column({ type: 'jsonb', default: {} }) analysis!: Record<string, unknown>;
  @Column({ default: 'SUGGESTED' }) status!: 'SUGGESTED'|'USED'|'DISMISSED';
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
}
