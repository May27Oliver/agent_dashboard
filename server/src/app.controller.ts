import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      service: 'Claude Cockpit Server',
      timestamp: new Date().toISOString(),
      websocket: 'ws://localhost:3001',
    };
  }
}
