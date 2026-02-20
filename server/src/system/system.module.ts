import { Module, Global } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemGateway } from './system.gateway';
import { ClaudeUsageService } from './claude-usage.service';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [SystemService, SystemGateway, ClaudeUsageService, RateLimitService],
  exports: [SystemService, SystemGateway, ClaudeUsageService, RateLimitService],
})
export class SystemModule {}
