import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
@Entity('refresh_tokens')
@Index(['tokenHash'],{unique:true})
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() userId!: string;
  @Column() tokenHash!: string;
  @Column({type:'timestamptz'}) expiresAt!: Date;
  @Column({type:'timestamptz',nullable:true}) revokedAt?: Date;
  @Column({nullable:true}) userAgent?: string;
  @Column({nullable:true}) ipAddress?: string;
  @Column({type:'timestamptz',default:()=> 'now()'}) createdAt!: Date;
}
