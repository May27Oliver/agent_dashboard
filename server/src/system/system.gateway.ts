import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SystemService, EventLog } from './system.service';
import { ClaudeUsageService, PromptUsageInfo } from './claude-usage.service';
import { RateLimitService, RateLimitInfo } from './rate-limit.service';
import { UserSettingsService, FullSettings } from './user-settings.service';

export interface ClaudeUsageInfo {
  todayTokens: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayCacheReadTokens: number;
  todayCacheCreationTokens: number;
  todayRequests: number;
  todaySessions: number;
  promptUsage: PromptUsageInfo;
  lastUpdated: number;
}

export interface SystemStatsResponse {
  cpu: number;
  memory: number;
  activePty: number;
  wsConnections: number;
  uptime: number;
  claudeUsage: ClaudeUsageInfo;
  rateLimit: RateLimitInfo | null;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class SystemGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private statsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly systemService: SystemService,
    private readonly claudeUsageService: ClaudeUsageService,
    private readonly rateLimitService: RateLimitService,
    private readonly userSettingsService: UserSettingsService,
  ) {
    // Start broadcasting stats every 2 seconds
    this.startStatsBroadcast();

    // Add initial system log
    this.systemService.addLog('info', 'System gateway initialized', 'system');
  }

  private startStatsBroadcast(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // 立即發送一次基本 stats
    const initialStats = this.systemService.getStats();
    console.log('[SystemGateway] Sending initial basic stats');

    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.getStatsWithClaudeUsage();
        this.server?.emit('system:stats', stats);
      } catch (error) {
        console.error('[SystemGateway] Failed to broadcast stats:', error);
        // Send basic stats on error
        const basicStats = this.systemService.getStats();
        this.server?.emit('system:stats', {
          ...basicStats,
          claudeUsage: {
            todayTokens: 0,
            todayInputTokens: 0,
            todayOutputTokens: 0,
            todayCacheReadTokens: 0,
            todayCacheCreationTokens: 0,
            todayRequests: 0,
            todaySessions: 0,
            promptUsage: {
              windowPrompts: 0,
              windowLimit: null,
              windowRemaining: null,
              windowResetTime: null,
              todayPrompts: 0,
              hourlyBreakdown: [],
            },
            lastUpdated: Date.now(),
          },
          rateLimit: null,
        });
      }
    }, 2000);
  }

  private async getStatsWithClaudeUsage(): Promise<SystemStatsResponse> {
    const stats = this.systemService.getStats();
    const claudeUsage = await this.claudeUsageService.getUsageStats();
    const rateLimit = await this.rateLimitService.getRateLimits();

    return {
      ...stats,
      claudeUsage: {
        todayTokens: claudeUsage.todayTokens,
        todayInputTokens: claudeUsage.todayInputTokens,
        todayOutputTokens: claudeUsage.todayOutputTokens,
        todayCacheReadTokens: claudeUsage.todayCacheReadTokens,
        todayCacheCreationTokens: claudeUsage.todayCacheCreationTokens,
        todayRequests: claudeUsage.todayRequests,
        todaySessions: claudeUsage.todaySessions,
        promptUsage: claudeUsage.promptUsage,
        lastUpdated: Date.now(),
      },
      rateLimit,
    };
  }

  // 處理取得用戶設定請求
  @SubscribeMessage('settings:get')
  async handleGetSettings(@ConnectedSocket() client: Socket) {
    const settings = await this.userSettingsService.getSettings('default');
    client.emit('settings:response', settings);
    return settings;
  }

  // 處理更新用戶設定請求
  @SubscribeMessage('settings:update')
  async handleUpdateSettings(
    @MessageBody() partialSettings: Partial<FullSettings>,
    @ConnectedSocket() client: Socket,
  ) {
    const settings = await this.userSettingsService.updateSettings('default', partialSettings);
    // 廣播設定更新給所有客戶端
    this.server.emit('settings:updated', settings);
    // 記錄日誌（僅在 claudePlan 變更時）
    if (partialSettings.claudePlan) {
      const log = this.systemService.addLog(
        'info',
        `Claude plan updated to: ${settings.claudePlan}`,
        'settings',
      );
      this.server.emit('system:log', log);
    }
    return { success: true };
  }

  async handleConnection(client: Socket) {
    console.log(`[SystemGateway] Client connecting: ${client.id}`);
    this.systemService.incrementWsConnections();

    // Send basic stats immediately (don't wait for Claude usage calculation)
    const basicStats = this.systemService.getStats();
    const immediateStats = {
      ...basicStats,
      claudeUsage: {
        todayTokens: 0,
        todayInputTokens: 0,
        todayOutputTokens: 0,
        todayCacheReadTokens: 0,
        todayCacheCreationTokens: 0,
        todayRequests: 0,
        todaySessions: 0,
        promptUsage: {
          windowPrompts: 0,
          windowLimit: null,
          windowRemaining: null,
          windowResetTime: null,
          todayPrompts: 0,
          hourlyBreakdown: [],
        },
        lastUpdated: Date.now(),
      },
      rateLimit: null,
    };
    console.log(`[SystemGateway] Sending immediate stats to ${client.id}`);
    client.emit('system:stats', immediateStats);

    // Log the connection
    const log = this.systemService.addLog(
      'success',
      `Client connected: ${client.id.substring(0, 8)}...`,
      'websocket',
    );
    this.server.emit('system:log', log);

    // Send existing logs
    const logs = this.systemService.getLogs();
    logs.forEach((existingLog) => {
      client.emit('system:log', existingLog);
    });

    // Then fetch full stats asynchronously
    this.getStatsWithClaudeUsage()
      .then((stats) => {
        console.log(`[SystemGateway] Sending full stats to ${client.id}`);
        client.emit('system:stats', stats);
      })
      .catch((error) => {
        console.error('[SystemGateway] Failed to get full stats:', error);
      });
  }

  handleDisconnect(client: Socket) {
    this.systemService.decrementWsConnections();

    // Log the disconnection
    const log = this.systemService.addLog(
      'info',
      `Client disconnected: ${client.id.substring(0, 8)}...`,
      'websocket',
    );
    this.server.emit('system:log', log);
  }

  // Public method to emit logs from other services
  emitLog(level: EventLog['level'], message: string, source?: string): void {
    const log = this.systemService.addLog(level, message, source);
    this.server?.emit('system:log', log);
  }

  // Public method to get current stats
  async getStats(): Promise<SystemStatsResponse> {
    return this.getStatsWithClaudeUsage();
  }

  // Force refresh rate limit cache
  refreshRateLimits(): void {
    this.rateLimitService.invalidateCache();
  }

  // Force refresh Claude usage cache
  refreshClaudeUsage(): void {
    this.claudeUsageService.invalidateCache();
  }
}
