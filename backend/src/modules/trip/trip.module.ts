import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripController } from './trip.controller';
import { TripEntity } from './trip.entity';
import { TripService } from './trip.service';

@Module({ imports: [TypeOrmModule.forFeature([TripEntity])], controllers: [TripController], providers: [TripService] })
export class TripModule {}
