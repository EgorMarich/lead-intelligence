import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { OutreachChannel } from './outreach-message.entity';

@Entity('outreach_templates')
@Index(['organizationId', 'channel'])
export class OutreachTemplateEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() name!: string;
  @Column({ type: 'enum', enum: ['EMAIL','TELEGRAM','VK','WHATSAPP','INSTAGRAM','PHONE'] }) channel!: OutreachChannel;
  @Column({ nullable: true }) subject?: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ default: false }) isDefault!: boolean;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
