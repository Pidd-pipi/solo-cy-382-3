import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TripService } from './trip.service';
import { CreateTripInput, MatchQuery } from './trip.types';

@Controller('api/trips')
export class TripController {
  constructor(private readonly service: TripService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: CreateTripInput) { return this.service.create(body); }
  @Get('match') match(@Query() query: MatchQuery) { return this.service.match(query); }
}
