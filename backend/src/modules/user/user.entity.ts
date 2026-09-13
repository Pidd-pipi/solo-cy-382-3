import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) email!: string;
  @Column() nickname!: string;
  @Column({ name: 'password_hash' }) passwordHash!: string;
  @Column({ nullable: true, type: 'text' }) bio?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
