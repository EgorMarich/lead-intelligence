import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentStatus { PENDING='PENDING', SUCCEEDED='SUCCEEDED', CANCELED='CANCELED', REFUNDED='REFUNDED' }

@Entity('payments')
@Index(['providerPaymentId'], { unique: true })
@Index(['organizationId', 'createdAt'])
@Index(['organizationId', 'idempotencyKey'], { unique: true })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() subscriptionId!: string;
  @Column() planCode!: string;
  @Column({ type: 'integer' }) amountRub!: number;
  @Column({ length: 3, default: 'RUB' }) currency!: string;
  @Column({ nullable: true }) providerPaymentId?: string;
  @Column({ nullable: true }) confirmationUrl?: string;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) status!: PaymentStatus;
  @Column({ nullable: true }) idempotencyKey?: string;
  @Column({ type: 'jsonb', nullable: true }) providerPayload?: Record<string, unknown>;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
