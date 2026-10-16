import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('organizations')
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column({unique:true,nullable:true}) slug?: string;
  @Column({length:2,default:'RU'}) countryCode!: string;
  @Column({length:10,default:'ru'}) languageCode!: string;
  @Column({length:3,default:'RUB'}) currencyCode!: string;
  @Column({length:64,default:'Europe/Moscow'}) timezone!: string;
  @Column({default:true}) isActive!: boolean;
  @Column({type:'timestamptz',default:()=> 'now()'}) createdAt!: Date;
  @Column({type:'timestamptz',default:()=> 'now()'}) updatedAt!: Date;
}
