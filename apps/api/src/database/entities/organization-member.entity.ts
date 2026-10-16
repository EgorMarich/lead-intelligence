import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
export enum OrganizationRole { OWNER='OWNER', ADMIN='ADMIN', MANAGER='MANAGER', ANALYST='ANALYST', VIEWER='VIEWER' }
@Entity('organization_members')
@Index(['organizationId','userId'],{unique:true})
export class OrganizationMemberEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() organizationId!: string;
  @Column() userId!: string;
  @Column({type:'enum',enum:OrganizationRole,default:OrganizationRole.VIEWER}) role!: OrganizationRole;
  @Column({type:'timestamptz',default:()=> 'now()'}) createdAt!: Date;
}
