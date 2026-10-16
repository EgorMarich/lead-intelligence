import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AiInsightPayload = {
  summary: string;
  icpFit: number;
  painPoints: Array<{ title: string; evidence: string; impact: 'LOW'|'MEDIUM'|'HIGH' }>;
  pitch: string;
  recommendedChannels: Array<{ channel: string; reason: string; priority: number }>;
  objections: Array<{ objection: string; response: string }>;
  nextBestAction: { action: string; reason: string };
  outreachVariants: Array<{ channel: string; subject?: string; body: string }>;
  confidence: number;
};

@Entity('ai_insights')
@Index(['organizationId', 'businessId'], { unique: true })
export class AiInsightEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() businessId!: string;
  @Column({ type: 'jsonb' }) payload!: AiInsightPayload;
  @Column({ type: 'varchar', default: 'heuristic' }) provider!: string;
  @Column({ type: 'varchar', default: 'lead-intelligence-v1' }) model!: string;
  @Column({ type: 'timestamptz', default: () => 'now()' }) generatedAt!: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
