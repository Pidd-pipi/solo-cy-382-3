import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    this.logger.error(exception instanceof Error ? exception.message : String(exception));
    response.status(status).json(exception instanceof HttpException ? exception.getResponse() : { success: false, code: 'INTERNAL_ERROR', message: '服务器内部错误' });
  }
}
