import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) code!: string;
  @Column() name!: string;
  @Column({ nullable: true }) parentCategoryId?: string;
  @Column({ default: true }) isActive!: boolean;
}
