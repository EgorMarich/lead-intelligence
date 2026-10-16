import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
export enum UserStatus { ACTIVE='ACTIVE', BLOCKED='BLOCKED', PENDING='PENDING' }
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({unique:true}) email!: string;
  @Column() passwordHash!: string;
  @Column({nullable:true}) name?: string;
  @Column({type:'enum', enum:UserStatus, default:UserStatus.ACTIVE}) status!: UserStatus;
  @Column({default:false}) emailVerified!: boolean;
  @Column({type:'timestamptz',nullable:true}) lastLoginAt?: Date;
  @Column({type:'timestamptz',default:()=> 'now()'}) createdAt!: Date;
  @Column({type:'timestamptz',default:()=> 'now()'}) updatedAt!: Date;
}
