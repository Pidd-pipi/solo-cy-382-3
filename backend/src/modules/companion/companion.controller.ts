import { Body, Controller, Post } from '@nestjs/common';
import { CompanionService } from './companion.service';

@Controller('api/companions')
export class CompanionController {
  constructor(private readonly service: CompanionService) {}
  @Post('score') score(@Body() body: any) { return { score: this.service.score(body.candidate, body.target) }; }
}
