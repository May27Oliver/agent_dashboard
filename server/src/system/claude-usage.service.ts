import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

// Prompt 使用量資訊（5 小時窗口）
export interface PromptUsageInfo {
  // 5 小時窗口內的 prompt 統計
  windowPrompts: number;           // 當前窗口已使用的 prompt 數
  windowLimit: number | null;      // 用戶設定的窗口限制（可選）
  windowRemaining: number | null;  // 剩餘 prompt 數
  windowResetTime: string | null;  // 窗口重置時間

  // 今日統計
  todayPrompts: number;            // 今日總 prompt 數

  // 分時統計（用於圖表）
  hourlyBreakdown: {
    hour: string;                  // ISO 時間戳
    prompts: number;
  }[];
}

export interface ClaudeUsageStats {
  todayTokens: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayCacheReadTokens: number;
  todayCacheCreationTokens: number;
  todayRequests: number;
  todaySessions: number;
  modelBreakdown: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    requests: number;
  }>;
  // 新增 Prompt 使用量
  promptUsage: PromptUsageInfo;
  lastUpdated: number;
}

interface AssistantMessage {
  type: 'assistant';
  timestamp: string;
  message?: {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

interface HumanMessage {
  type: 'human';
  timestamp: string;
}

// 用戶方案設定
export type ClaudePlan = 'pro' | 'max5' | 'max20' | 'custom';

export interface UserSettings {
  claudePlan: ClaudePlan;
  customPromptLimit?: number;  // 自訂 prompt 限制
}

// 各方案的預設 prompt 限制
const PLAN_PROMPT_LIMITS: Record<ClaudePlan, number> = {
  pro: 40,
  max5: 200,
  max20: 800,
  custom: 100,
};

@Injectable()
export class ClaudeUsageService {
  private readonly logger = new Logger(ClaudeUsageService.name);
  private readonly claudeDir: string;
  private cachedStats: ClaudeUsageStats | null = null;
  private lastCacheTime = 0;
  private readonly cacheTimeout = 30000; // 30 seconds cache
  private readonly WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds

  // 用戶設定（可透過 API 更新）
  private userSettings: UserSettings = {
    claudePlan: 'max20',
    customPromptLimit: undefined,
  };

  constructor() {
    this.claudeDir = path.join(os.homedir(), '.claude');
    this.loadUserSettings();
  }

  /**
   * 載入用戶設定（從本地檔案）
   */
  private loadUserSettings(): void {
    try {
      const settingsPath = path.join(this.claudeDir, 'dashboard-settings.json');
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(data);
        if (settings.claudePlan) {
          this.userSettings = settings;
        }
      }
    } catch (error) {
      this.logger.debug('No user settings found, using defaults');
    }
  }

  /**
   * 儲存用戶設定
   */
  saveUserSettings(settings: UserSettings): void {
    try {
      const settingsPath = path.join(this.claudeDir, 'dashboard-settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      this.userSettings = settings;
      this.invalidateCache();
    } catch (error) {
      this.logger.error('Failed to save user settings', error);
    }
  }

  /**
   * 取得用戶設定
   */
  getUserSettings(): UserSettings {
    return { ...this.userSettings };
  }

  /**
   * 取得用戶的 prompt 限制
   */
  private getUserPromptLimit(): number | null {
    if (this.userSettings.claudePlan === 'custom') {
      return this.userSettings.customPromptLimit ?? null;
    }
    return PLAN_PROMPT_LIMITS[this.userSettings.claudePlan];
  }

  async getUsageStats(): Promise<ClaudeUsageStats> {
    const now = Date.now();

    // Return cached stats if still valid
    if (this.cachedStats && (now - this.lastCacheTime) < this.cacheTimeout) {
      return this.cachedStats;
    }

    try {
      const stats = await this.calculateTodayUsage();
      this.cachedStats = stats;
      this.lastCacheTime = now;
      return stats;
    } catch (error) {
      this.logger.error('Failed to calculate usage stats', error);
      return this.getEmptyStats();
    }
  }

  private async calculateTodayUsage(): Promise<ClaudeUsageStats> {
    const projectsDir = path.join(this.claudeDir, 'projects');

    if (!fs.existsSync(projectsDir)) {
      this.logger.warn('Claude projects directory not found');
      return this.getEmptyStats();
    }

    const today = this.getTodayDateString();
    const stats = this.getEmptyStats();
    const processedSessions = new Set<string>();

    // Get all project directories
    const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(projectsDir, dirent.name));

    // Process each project directory
    for (const projectDir of projectDirs) {
      try {
        const jsonlFiles = fs.readdirSync(projectDir)
          .filter(file => file.endsWith('.jsonl'));

        for (const jsonlFile of jsonlFiles) {
          const filePath = path.join(projectDir, jsonlFile);
          const sessionId = jsonlFile.replace('.jsonl', '');

          // Skip if already processed
          if (processedSessions.has(sessionId)) continue;

          // Check file modification time - skip if not modified today
          const fileStat = fs.statSync(filePath);
          const fileModDate = this.getDateString(fileStat.mtime);
          if (fileModDate !== today) continue;

          const sessionStats = await this.processJsonlFile(filePath, today);

          if (sessionStats.requests > 0) {
            processedSessions.add(sessionId);
            stats.todayTokens += sessionStats.totalTokens;
            stats.todayInputTokens += sessionStats.inputTokens;
            stats.todayOutputTokens += sessionStats.outputTokens;
            stats.todayCacheReadTokens += sessionStats.cacheReadTokens;
            stats.todayCacheCreationTokens += sessionStats.cacheCreationTokens;
            stats.todayRequests += sessionStats.requests;

            // Merge model breakdown
            for (const [model, modelStats] of Object.entries(sessionStats.modelBreakdown)) {
              if (!stats.modelBreakdown[model]) {
                stats.modelBreakdown[model] = {
                  inputTokens: 0,
                  outputTokens: 0,
                  cacheReadTokens: 0,
                  cacheCreationTokens: 0,
                  requests: 0,
                };
              }
              stats.modelBreakdown[model].inputTokens += modelStats.inputTokens;
              stats.modelBreakdown[model].outputTokens += modelStats.outputTokens;
              stats.modelBreakdown[model].cacheReadTokens += modelStats.cacheReadTokens;
              stats.modelBreakdown[model].cacheCreationTokens += modelStats.cacheCreationTokens;
              stats.modelBreakdown[model].requests += modelStats.requests;
            }
          }
        }
      } catch (error) {
        this.logger.debug(`Error processing project dir ${projectDir}: ${error}`);
      }
    }

    stats.todaySessions = processedSessions.size;
    stats.lastUpdated = Date.now();

    // 計算 Prompt 使用量
    stats.promptUsage = await this.calculateWindowPrompts();

    return stats;
  }

  private async processJsonlFile(filePath: string, today: string): Promise<{
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    requests: number;
    modelBreakdown: Record<string, {
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      cacheCreationTokens: number;
      requests: number;
    }>;
  }> {
    const result = {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      requests: 0,
      modelBreakdown: {} as Record<string, {
        inputTokens: number;
        outputTokens: number;
        cacheReadTokens: number;
        cacheCreationTokens: number;
        requests: number;
      }>,
    };

    return new Promise((resolve) => {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        try {
          const entry = JSON.parse(line);

          // Only process assistant messages with usage data from today
          if (entry.type === 'assistant' && entry.message?.usage && entry.timestamp) {
            const entryDate = this.getDateString(new Date(entry.timestamp));

            if (entryDate === today) {
              const usage = entry.message.usage;
              const model = entry.message.model || 'unknown';

              const inputTokens = usage.input_tokens || 0;
              const outputTokens = usage.output_tokens || 0;
              const cacheReadTokens = usage.cache_read_input_tokens || 0;
              const cacheCreationTokens = usage.cache_creation_input_tokens || 0;

              // Total tokens includes all types
              const totalTokens = inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens;

              result.totalTokens += totalTokens;
              result.inputTokens += inputTokens;
              result.outputTokens += outputTokens;
              result.cacheReadTokens += cacheReadTokens;
              result.cacheCreationTokens += cacheCreationTokens;
              result.requests += 1;

              // Model breakdown
              if (!result.modelBreakdown[model]) {
                result.modelBreakdown[model] = {
                  inputTokens: 0,
                  outputTokens: 0,
                  cacheReadTokens: 0,
                  cacheCreationTokens: 0,
                  requests: 0,
                };
              }
              result.modelBreakdown[model].inputTokens += inputTokens;
              result.modelBreakdown[model].outputTokens += outputTokens;
              result.modelBreakdown[model].cacheReadTokens += cacheReadTokens;
              result.modelBreakdown[model].cacheCreationTokens += cacheCreationTokens;
              result.modelBreakdown[model].requests += 1;
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      });

      rl.on('close', () => {
        resolve(result);
      });

      rl.on('error', () => {
        resolve(result);
      });
    });
  }

  private getTodayDateString(): string {
    return this.getDateString(new Date());
  }

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 計算 5 小時窗口的起始時間
   * 窗口邊界：UTC 00:00, 05:00, 10:00, 15:00, 20:00
   */
  private getWindowStartTime(nowMs: number): number {
    const date = new Date(nowMs);
    const hours = date.getUTCHours();
    const windowStartHour = Math.floor(hours / 5) * 5;

    date.setUTCHours(windowStartHour, 0, 0, 0);
    return date.getTime();
  }

  /**
   * 計算 5 小時窗口內的 prompt 使用量
   */
  private async calculateWindowPrompts(): Promise<PromptUsageInfo> {
    const now = Date.now();
    const windowStart = this.getWindowStartTime(now);
    const windowEnd = windowStart + this.WINDOW_MS;

    // 計算窗口內的 prompt 數
    const windowPrompts = await this.countPromptsInRange(windowStart, now);

    // 計算今日 prompt 數
    const todayPrompts = await this.countTodayPrompts();

    // 計算分時統計
    const hourlyBreakdown = await this.getHourlyBreakdown();

    const windowLimit = this.getUserPromptLimit();

    return {
      windowPrompts,
      windowLimit,
      windowRemaining: windowLimit !== null ? Math.max(0, windowLimit - windowPrompts) : null,
      windowResetTime: new Date(windowEnd).toISOString(),
      todayPrompts,
      hourlyBreakdown,
    };
  }

  /**
   * 計算指定時間範圍內的 prompt 數量
   * Prompt 定義：用戶發送的每一個 human 角色訊息
   */
  private async countPromptsInRange(startMs: number, endMs: number): Promise<number> {
    const projectsDir = path.join(this.claudeDir, 'projects');

    if (!fs.existsSync(projectsDir)) {
      return 0;
    }

    let totalPrompts = 0;

    const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(projectsDir, dirent.name));

    for (const projectDir of projectDirs) {
      try {
        const jsonlFiles = fs.readdirSync(projectDir)
          .filter(file => file.endsWith('.jsonl'));

        for (const jsonlFile of jsonlFiles) {
          const filePath = path.join(projectDir, jsonlFile);
          const prompts = await this.countPromptsInFile(filePath, startMs, endMs);
          totalPrompts += prompts;
        }
      } catch (error) {
        this.logger.debug(`Error processing project dir ${projectDir}: ${error}`);
      }
    }

    return totalPrompts;
  }

  /**
   * 計算單一檔案中指定時間範圍的 prompt 數量
   */
  private async countPromptsInFile(filePath: string, startMs: number, endMs: number): Promise<number> {
    return new Promise((resolve) => {
      let count = 0;

      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        try {
          const entry = JSON.parse(line);

          // 只計算 human 訊息
          if (entry.type === 'human' && entry.timestamp) {
            const entryTime = new Date(entry.timestamp).getTime();

            if (entryTime >= startMs && entryTime <= endMs) {
              count += 1;
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      });

      rl.on('close', () => resolve(count));
      rl.on('error', () => resolve(count));
    });
  }

  /**
   * 計算今日的 prompt 數量
   */
  private async countTodayPrompts(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startMs = today.getTime();
    const endMs = Date.now();

    return this.countPromptsInRange(startMs, endMs);
  }

  /**
   * 取得分時 prompt 統計（過去 6 小時，減少計算時間）
   */
  private async getHourlyBreakdown(): Promise<{ hour: string; prompts: number }[]> {
    const now = Date.now();
    const breakdown: { hour: string; prompts: number }[] = [];

    // 只計算過去 6 小時，減少初始載入時間
    for (let i = 5; i >= 0; i--) {
      const hourEnd = now - (i * 60 * 60 * 1000);
      const hourStart = hourEnd - (60 * 60 * 1000);

      const prompts = await this.countPromptsInRange(hourStart, hourEnd);
      breakdown.push({
        hour: new Date(hourStart).toISOString(),
        prompts,
      });
    }

    return breakdown;
  }

  private getEmptyStats(): ClaudeUsageStats {
    return {
      todayTokens: 0,
      todayInputTokens: 0,
      todayOutputTokens: 0,
      todayCacheReadTokens: 0,
      todayCacheCreationTokens: 0,
      todayRequests: 0,
      todaySessions: 0,
      modelBreakdown: {},
      promptUsage: {
        windowPrompts: 0,
        windowLimit: this.getUserPromptLimit(),
        windowRemaining: this.getUserPromptLimit(),
        windowResetTime: null,
        todayPrompts: 0,
        hourlyBreakdown: [],
      },
      lastUpdated: Date.now(),
    };
  }

  // Force refresh cache
  invalidateCache(): void {
    this.cachedStats = null;
    this.lastCacheTime = 0;
  }
}
