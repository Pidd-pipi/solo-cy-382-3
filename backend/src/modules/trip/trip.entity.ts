import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

const decimalToNumber = {
  to: (value?: number) => value,
  from: (value: string | null) => (value === null ? undefined : Number(value))
};

@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'owner_id' }) ownerId!: number;
  @Column({ length: 120 }) destination!: string;
  @Column({ name: 'depart_date', type: 'date' }) departDate!: string;
  @Column() days!: number;
  @Column({ name: 'budget_min', type: 'decimal', nullable: true, transformer: decimalToNumber }) budgetMin?: number;
  @Column({ name: 'budget_max', type: 'decimal', nullable: true, transformer: decimalToNumber }) budgetMax?: number;
  @Column({ length: 40 }) transport!: string;
  @Column({ name: 'companion_count' }) companionCount!: number;
  @Column({ name: 'gender_preference', nullable: true }) genderPreference?: string;
  @Column({ default: 'OPEN' }) status!: string;
}
