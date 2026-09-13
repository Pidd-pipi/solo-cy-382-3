import { Module } from '@nestjs/common';
import { CompanionController } from './companion.controller';
import { CompanionService } from './companion.service';

@Module({ controllers: [CompanionController], providers: [CompanionService] })
export class CompanionModule {}
