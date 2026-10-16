import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('cities')
export class CityEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) name!: string;
  @Column({ length: 2 }) countryCode!: string;
  @Column({ nullable: true }) region?: string;
  @Column({ nullable: true, type: 'double precision' }) latitude?: number;
  @Column({ nullable: true, type: 'double precision' }) longitude?: number;
  @Column({ default: 'Europe/Moscow' }) timezone!: string;
  @Column({ default: true }) isActive!: boolean;
}
