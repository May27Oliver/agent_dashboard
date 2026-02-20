import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemService } from './system.service';
import { SystemGateway } from './system.gateway';
import { ClaudeUsageService } from './claude-usage.service';
import { RateLimitService } from './rate-limit.service';
import { UserSettingsService } from './user-settings.service';
import { UserSettingsEntity } from '../entities/user-settings.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserSettingsEntity])],
  providers: [SystemService, SystemGateway, ClaudeUsageService, RateLimitService, UserSettingsService],
  exports: [SystemService, SystemGateway, ClaudeUsageService, RateLimitService, UserSettingsService],
})
export class SystemModule {}
