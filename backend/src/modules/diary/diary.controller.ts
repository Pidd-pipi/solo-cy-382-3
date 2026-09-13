import { Body, Controller, Get, Param, Post } from '@nestjs/common';

const entries: any[] = [{ tripId: 1, title: '大理第一天', content: '环洱海骑行，晚上整理照片。' }];

@Controller('api/diaries')
export class DiaryController {
  @Get(':tripId') list(@Param('tripId') tripId: string) { return entries.filter(item => item.tripId === Number(tripId)); }
  @Post() create(@Body() body: any) { entries.push({ ...body, createdAt: new Date().toISOString() }); return body; }
}
