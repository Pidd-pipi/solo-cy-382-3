import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TripService } from './trip.service';

@Controller('api/trips')
export class TripController {
  constructor(private readonly service: TripService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Get('match') match(@Query('destination') destination: string, @Query('date') date: string, @Query('budgetMax') budgetMax: string) { return this.service.match(destination, date, Number(budgetMax)); }
}
