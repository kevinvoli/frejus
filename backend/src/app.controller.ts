import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Endpoint de santé, utile pour un healthcheck Docker / VPS.
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
