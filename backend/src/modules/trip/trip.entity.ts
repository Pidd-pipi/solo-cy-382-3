import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'owner_id' }) ownerId!: number;
  @Column() destination!: string;
  @Column({ name: 'depart_date', type: 'date' }) departDate!: string;
  @Column() days!: number;
  @Column({ name: 'budget_min', type: 'decimal', nullable: true }) budgetMin?: number;
  @Column({ name: 'budget_max', type: 'decimal', nullable: true }) budgetMax?: number;
  @Column() transport!: string;
  @Column({ name: 'companion_count' }) companionCount!: number;
  @Column({ name: 'gender_preference', nullable: true }) genderPreference?: string;
  @Column({ default: 'OPEN' }) status!: string;
}
