import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('api/users')
export class UserController {
  constructor(private readonly service: UserService) {}
  @Post('register') register(@Body() body: { email: string; nickname: string; password: string }) { return this.service.register(body.email, body.nickname, body.password); }
  @Post('login') login(@Body() body: { email: string; password: string }) { return this.service.login(body.email, body.password); }
}
