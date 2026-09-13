import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES } from '../../constants/errors';
import { AppException } from '../errors/app.exception';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new AppException(ERROR_CODES.AUTH_REQUIRED, '请先登录', 401);
    req.user = this.jwt.verify(token);
    return true;
  }
}
