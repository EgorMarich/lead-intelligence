import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
export enum InvitationStatus { PENDING='PENDING', ACCEPTED='ACCEPTED', REVOKED='REVOKED', EXPIRED='EXPIRED' }
@Entity('organization_invitations')
@Index(['organizationId','email','status'])
@Index(['tokenHash'], { unique: true })
export class OrganizationInvitationEntity {
 @PrimaryGeneratedColumn('uuid') id!: string;
 @Column() organizationId!: string;
 @Column() email!: string;
 @Column({type:'enum',enum:InvitationStatus,default:InvitationStatus.PENDING}) status!: InvitationStatus;
 @Column() role!: string;
 @Column() tokenHash!: string;
 @Column({type:'timestamptz'}) expiresAt!: Date;
 @Column() invitedByUserId!: string;
 @Column({type:'timestamptz',nullable:true}) acceptedAt?: Date;
 @Column({type:'timestamptz',nullable:true}) revokedAt?: Date;
 @Column({type:'timestamptz',default:()=> 'now()'}) createdAt!: Date;
}
