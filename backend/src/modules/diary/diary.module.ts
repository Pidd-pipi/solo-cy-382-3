import { Module } from '@nestjs/common';
import { DiaryController } from './diary.controller';

@Module({ controllers: [DiaryController] })
export class DiaryModule {}
