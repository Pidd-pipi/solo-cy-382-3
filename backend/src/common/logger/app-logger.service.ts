import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppLogger extends Logger {
  logRequest(method: string, url: string) {
    this.log(`${method} ${url}`);
  }
}
