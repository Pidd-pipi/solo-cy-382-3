import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { TripEntity } from './trip.entity';

@Injectable()
export class TripService {
  constructor(@InjectRepository(TripEntity) private readonly trips: Repository<TripEntity>) {}
  create(input: Partial<TripEntity>) { return this.trips.save(this.trips.create(input)); }
  list() { return this.trips.find({ order: { departDate: 'ASC' } }); }
  match(destination: string, date: string, budgetMax: number) {
    return this.trips.find({ where: { destination, departDate: Between(date, date), budgetMax } });
  }
}
