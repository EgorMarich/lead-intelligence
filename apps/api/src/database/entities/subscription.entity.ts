import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum SubscriptionStatus {
  PENDING='PENDING', ACTIVE='ACTIVE', PAST_DUE='PAST_DUE', CANCELED='CANCELED', EXPIRED='EXPIRED'
}

@Entity('subscriptions')
@Index(['organizationId'])
@Index(['status', 'currentPeriodEnd'])
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() planCode!: string;
  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.PENDING }) status!: SubscriptionStatus;
  @Column({ type: 'timestamptz' }) currentPeriodStart!: Date;
  @Column({ type: 'timestamptz' }) currentPeriodEnd!: Date;
  @Column({ type: 'timestamptz', nullable: true }) canceledAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) gracePeriodEndsAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) renewalLockUntil?: Date;
  @Column({ nullable: true }) paymentMethodId?: string;
  @Column({ default: false }) autoRenew!: boolean;
  @Column({ nullable: true }) provider!: string;
  @Column({ nullable: true }) providerCustomerId?: string;
  @Column({ nullable: true }) lastPaymentId?: string;
  @Column({ type: 'timestamptz', default: () => 'now()' }) createdAt!: Date;
  @Column({ type: 'timestamptz', default: () => 'now()' }) updatedAt!: Date;
}
