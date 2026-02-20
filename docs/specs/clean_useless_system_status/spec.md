# System Status 重構規格書

## 概述

本規格書描述對 System Status Board 的重構，目標是：
1. 移除無意義的 `Accounts` 指標
2. 整合真實的 Anthropic API Rate Limit 資訊
3. 移除所有硬編碼的假數據

---

## 一、移除項目

### 1.1 移除 Accounts 指標

**原因**：`accountCount` 初始化為 0，且整個 codebase 中沒有任何地方調用 `setAccountCount()`，導致此指標永遠顯示 0。

**影響檔案**：

| 檔案 | 變更 |
|------|------|
| `server/src/system/system.service.ts` | 移除 `accountCount` 屬性、`setAccountCount()` 方法、`accounts` 輸出 |
| `client/src/components/System/SystemStatusPanel.tsx` | 移除 Accounts 顯示區塊 |
| `client/src/types/index.ts` | 從 `SystemStats` 類型移除 `accounts` 欄位 |

### 1.2 移除硬編碼的 Rate Limit 值

**原因**：目前 `limit: 1000000` 和 `requestsLimit: 1000` 都是硬編碼，不反映真實的 API 限制。

**移除項目**：
- `system.service.ts` 中的 `tokenUsage` 初始化
- `system.gateway.ts` 中的 fallback 硬編碼值 (`|| 1000000`, `|| 1000`)

---

## 二、新增功能：真實 Rate Limit 資料

### 2.1 Anthropic API Rate Limit Headers

根據 [Anthropic API 文檔](https://platform.claude.com/docs/en/api/rate-limits)，API 會在每次回應中返回以下 headers：

#### 核心 Headers

| Header | 說明 | 類型 |
|--------|------|------|
| `anthropic-ratelimit-requests-limit` | 最大請求數/分鐘 | number |
| `anthropic-ratelimit-requests-remaining` | 剩餘請求數 | number |
| `anthropic-ratelimit-requests-reset` | 請求限制重置時間 | RFC 3339 timestamp |
| `anthropic-ratelimit-input-tokens-limit` | 最大 input tokens/分鐘 | number |
| `anthropic-ratelimit-input-tokens-remaining` | 剩餘 input tokens | number |
| `anthropic-ratelimit-input-tokens-reset` | Input token 限制重置時間 | RFC 3339 timestamp |
| `anthropic-ratelimit-output-tokens-limit` | 最大 output tokens/分鐘 | number |
| `anthropic-ratelimit-output-tokens-remaining` | 剩餘 output tokens | number |
| `anthropic-ratelimit-output-tokens-reset` | Output token 限制重置時間 | RFC 3339 timestamp |
| `retry-after` | 429 錯誤時的等待秒數 | number |

#### 組合 Headers（顯示最嚴格的限制）

| Header | 說明 |
|--------|------|
| `anthropic-ratelimit-tokens-limit` | 最大總 tokens/分鐘 |
| `anthropic-ratelimit-tokens-remaining` | 剩餘總 tokens |
| `anthropic-ratelimit-tokens-reset` | Token 限制重置時間 |

### 2.2 資料獲取策略

由於 Claude Code CLI 不直接提供 API headers，我們採用以下策略：

#### 方案 A：解析 Claude 日誌（推薦）

Claude CLI 可能在 `~/.claude/` 目錄中記錄 rate limit 資訊。

**實作步驟**：
1. 檢查 `~/.claude/` 目錄結構，尋找 rate limit 相關日誌
2. 如果存在，解析最近的 rate limit 資料
3. 如果不存在，顯示「無法獲取」狀態

#### 方案 B：直接呼叫 Anthropic API

如果用戶配置了 `ANTHROPIC_API_KEY`，可以發送一個輕量級請求來獲取 headers。

**實作步驟**：
1. 檢查環境變數 `ANTHROPIC_API_KEY`
2. 每 5 分鐘發送一次 `/v1/messages` 請求（使用最小 tokens）
3. 解析 response headers 獲取 rate limit 資訊
4. 緩存結果避免頻繁請求

**API 請求範例**：
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-3-haiku-20240307', // 使用最便宜的模型
    max_tokens: 1,
    messages: [{ role: 'user', content: 'hi' }],
  }),
});

// 解析 headers
const rateLimits = {
  requests: {
    limit: parseInt(response.headers.get('anthropic-ratelimit-requests-limit') || '0'),
    remaining: parseInt(response.headers.get('anthropic-ratelimit-requests-remaining') || '0'),
    reset: response.headers.get('anthropic-ratelimit-requests-reset'),
  },
  inputTokens: {
    limit: parseInt(response.headers.get('anthropic-ratelimit-input-tokens-limit') || '0'),
    remaining: parseInt(response.headers.get('anthropic-ratelimit-input-tokens-remaining') || '0'),
    reset: response.headers.get('anthropic-ratelimit-input-tokens-reset'),
  },
  outputTokens: {
    limit: parseInt(response.headers.get('anthropic-ratelimit-output-tokens-limit') || '0'),
    remaining: parseInt(response.headers.get('anthropic-ratelimit-output-tokens-remaining') || '0'),
    reset: response.headers.get('anthropic-ratelimit-output-tokens-reset'),
  },
};
```

#### 方案 C：混合模式（最佳）

1. **已使用量**：從 `~/.claude/projects/*.jsonl` 讀取（現有邏輯）
2. **Rate Limit**：透過 Anthropic API 獲取（新增）
3. **Fallback**：如果無法獲取，顯示「N/A」而非假數據

---

## 三、資料結構變更

### 3.1 後端類型定義

```typescript
// server/src/system/system.service.ts

// 移除舊的 TokenUsage
// export interface TokenUsage {
//   used: number;
//   limit: number;
//   resetAt: number;
//   requestsUsed: number;
//   requestsLimit: number;
// }

// 新增 RateLimitInfo
export interface RateLimitMetric {
  limit: number | null;      // null 表示無法獲取
  remaining: number | null;
  reset: string | null;      // RFC 3339 timestamp
}

export interface RateLimitInfo {
  requests: RateLimitMetric;
  inputTokens: RateLimitMetric;
  outputTokens: RateLimitMetric;
  lastUpdated: number;       // Unix timestamp
  source: 'api' | 'cache' | 'unavailable';
}

export interface ClaudeUsageInfo {
  todayTokens: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayCacheReadTokens: number;
  todayCacheCreationTokens: number;
  todayRequests: number;
  todaySessions: number;
  lastUpdated: number;
}

export interface SystemStats {
  cpu: number;
  memory: number;
  activePty: number;
  wsConnections: number;
  uptime: number;
  // 移除: accounts: number;
  // 移除: tokenUsage?: TokenUsage;
  claudeUsage: ClaudeUsageInfo;      // 本地統計（已使用量）
  rateLimit: RateLimitInfo | null;   // API rate limit（可選）
}
```

### 3.2 前端類型定義

```typescript
// client/src/types/index.ts

export interface RateLimitMetric {
  limit: number | null;
  remaining: number | null;
  reset: string | null;
}

export interface RateLimitInfo {
  requests: RateLimitMetric;
  inputTokens: RateLimitMetric;
  outputTokens: RateLimitMetric;
  lastUpdated: number;
  source: 'api' | 'cache' | 'unavailable';
}

export interface ClaudeUsageInfo {
  todayTokens: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayCacheReadTokens: number;
  todayCacheCreationTokens: number;
  todayRequests: number;
  todaySessions: number;
  lastUpdated: number;
}

export interface SystemStats {
  cpu: number;
  memory: number;
  activePty: number;
  wsConnections: number;
  uptime: number;
  claudeUsage: ClaudeUsageInfo;
  rateLimit: RateLimitInfo | null;
}
```

---

## 四、實作細節

### 4.1 新增 Rate Limit 服務

**檔案**：`server/src/system/rate-limit.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitMetric {
  limit: number | null;
  remaining: number | null;
  reset: string | null;
}

export interface RateLimitInfo {
  requests: RateLimitMetric;
  inputTokens: RateLimitMetric;
  outputTokens: RateLimitMetric;
  lastUpdated: number;
  source: 'api' | 'cache' | 'unavailable';
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private cache: RateLimitInfo | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分鐘
  private readonly API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

  async getRateLimits(): Promise<RateLimitInfo | null> {
    // 檢查緩存
    if (this.cache && Date.now() - this.cache.lastUpdated < this.CACHE_TTL) {
      return { ...this.cache, source: 'cache' };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not set, rate limits unavailable');
      return this.getUnavailableInfo();
    }

    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: '.' }],
        }),
      });

      const rateLimits: RateLimitInfo = {
        requests: {
          limit: this.parseHeader(response.headers.get('anthropic-ratelimit-requests-limit')),
          remaining: this.parseHeader(response.headers.get('anthropic-ratelimit-requests-remaining')),
          reset: response.headers.get('anthropic-ratelimit-requests-reset'),
        },
        inputTokens: {
          limit: this.parseHeader(response.headers.get('anthropic-ratelimit-input-tokens-limit')),
          remaining: this.parseHeader(response.headers.get('anthropic-ratelimit-input-tokens-remaining')),
          reset: response.headers.get('anthropic-ratelimit-input-tokens-reset'),
        },
        outputTokens: {
          limit: this.parseHeader(response.headers.get('anthropic-ratelimit-output-tokens-limit')),
          remaining: this.parseHeader(response.headers.get('anthropic-ratelimit-output-tokens-remaining')),
          reset: response.headers.get('anthropic-ratelimit-output-tokens-reset'),
        },
        lastUpdated: Date.now(),
        source: 'api',
      };

      this.cache = rateLimits;
      return rateLimits;
    } catch (error) {
      this.logger.error('Failed to fetch rate limits', error);
      return this.cache ? { ...this.cache, source: 'cache' } : this.getUnavailableInfo();
    }
  }

  private parseHeader(value: string | null): number | null {
    if (!value) return null;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  private getUnavailableInfo(): RateLimitInfo {
    return {
      requests: { limit: null, remaining: null, reset: null },
      inputTokens: { limit: null, remaining: null, reset: null },
      outputTokens: { limit: null, remaining: null, reset: null },
      lastUpdated: Date.now(),
      source: 'unavailable',
    };
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
```

### 4.2 修改 System Service

**檔案**：`server/src/system/system.service.ts`

變更清單：
1. 移除 `accountCount` 屬性和相關方法
2. 移除 `tokenUsage` 屬性和相關方法
3. 從 `getStats()` 輸出中移除 `accounts` 和 `tokenUsage`

### 4.3 修改 System Gateway

**檔案**：`server/src/system/system.gateway.ts`

變更清單：
1. 注入 `RateLimitService`
2. 在 `getStatsWithClaudeUsage()` 中整合 rate limit 資料
3. 移除所有硬編碼的 fallback 值

```typescript
private async getStatsWithClaudeUsage(): Promise<SystemStats> {
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
      lastUpdated: Date.now(),
    },
    rateLimit,
  };
}
```

### 4.4 修改 System Module

**檔案**：`server/src/system/system.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemGateway } from './system.gateway';
import { ClaudeUsageService } from './claude-usage.service';
import { RateLimitService } from './rate-limit.service';

@Module({
  providers: [
    SystemService,
    SystemGateway,
    ClaudeUsageService,
    RateLimitService,  // 新增
  ],
  exports: [SystemService, SystemGateway, ClaudeUsageService, RateLimitService],
})
export class SystemModule {}
```

---

## 五、前端 UI 變更

### 5.1 SystemStatusPanel.tsx 修改

**移除**：
```tsx
// 移除 Accounts 顯示
<div className="flex justify-between items-center text-xs">
  <span className="text-slate-500">Accounts</span>
  <span className="text-purple-400 font-mono">{stats.accounts}</span>
</div>
```

**新增 Rate Limit 顯示**：
```tsx
{/* Rate Limit Section */}
{stats.rateLimit && stats.rateLimit.source !== 'unavailable' && (
  <div className="space-y-2 pt-3 border-t border-slate-700/50">
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">Requests</span>
      <span className="text-cyan-400 font-mono">
        {stats.rateLimit.requests.remaining ?? 'N/A'} / {stats.rateLimit.requests.limit ?? 'N/A'}
      </span>
    </div>
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">Input Tokens</span>
      <span className="text-blue-400 font-mono">
        {formatNumber(stats.rateLimit.inputTokens.remaining)} / {formatNumber(stats.rateLimit.inputTokens.limit)}
      </span>
    </div>
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">Output Tokens</span>
      <span className="text-green-400 font-mono">
        {formatNumber(stats.rateLimit.outputTokens.remaining)} / {formatNumber(stats.rateLimit.outputTokens.limit)}
      </span>
    </div>
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-400 text-[10px]">
        {stats.rateLimit.source === 'cache' ? '(cached)' : ''}
      </span>
    </div>
  </div>
)}

{stats.rateLimit?.source === 'unavailable' && (
  <div className="text-xs text-slate-500 pt-3 border-t border-slate-700/50">
    Rate limit unavailable (set ANTHROPIC_API_KEY)
  </div>
)}
```

### 5.2 新增輔助函數

```typescript
function formatNumber(value: number | null): string {
  if (value === null) return 'N/A';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}
```

---

## 六、環境變數

### 新增環境變數

| 變數名 | 說明 | 必要性 |
|--------|------|--------|
| `ANTHROPIC_API_KEY` | Anthropic API Key，用於獲取真實 rate limit | 可選 |

**注意**：如果未設置 `ANTHROPIC_API_KEY`，系統將：
1. 正常顯示 Claude 使用量（從本地日誌讀取）
2. Rate limit 區塊顯示「unavailable」狀態
3. 不會顯示任何假數據

---

## 七、測試計畫

### 7.1 單元測試

| 測試案例 | 預期結果 |
|----------|----------|
| `RateLimitService` 無 API Key | 返回 `source: 'unavailable'` |
| `RateLimitService` 有 API Key | 返回有效的 rate limit 資料 |
| `RateLimitService` API 失敗 | 返回緩存或 unavailable |
| `RateLimitService` 緩存有效 | 返回緩存資料，不發送 API 請求 |

### 7.2 整合測試

| 測試案例 | 預期結果 |
|----------|----------|
| 前端顯示 rate limit | 正確顯示 remaining/limit |
| 前端 rate limit unavailable | 顯示提示訊息，無假數據 |
| WebSocket 廣播 | 包含 `claudeUsage` 和 `rateLimit` |

### 7.3 UI 測試

| 測試案例 | 預期結果 |
|----------|----------|
| Accounts 已移除 | UI 中不再顯示 Accounts |
| Rate limit 數字格式化 | 大數字顯示為 K/M |
| Cached 標記 | 緩存資料顯示 (cached) |

---

## 八、遷移步驟

### 8.1 後端變更順序

1. 新增 `rate-limit.service.ts`
2. 修改 `system.module.ts` 註冊新服務
3. 修改 `system.service.ts` 移除 accounts 和 tokenUsage
4. 修改 `system.gateway.ts` 整合新的資料結構
5. 更新類型定義

### 8.2 前端變更順序

1. 更新 `types/index.ts` 類型定義
2. 修改 `SystemStatusPanel.tsx` UI
3. 移除 Accounts 相關代碼
4. 測試 WebSocket 資料接收

---

## 九、風險與注意事項

### 9.1 API 成本

每次獲取 rate limit 會消耗少量 tokens（約 10 tokens）。
- 預設 5 分鐘緩存，每小時最多 12 次請求
- 每日成本 < $0.01（使用 Haiku 模型）

### 9.2 API Key 安全

- `ANTHROPIC_API_KEY` 應存放在環境變數中
- 不應在前端暴露 API Key
- Rate limit 資訊由後端獲取並透過 WebSocket 傳送

### 9.3 向後相容

- 移除 `accounts` 欄位會影響現有前端
- 需要同時更新前後端
- 建議使用 feature flag 或版本控制

---

## 十、參考資料

- [Anthropic API Rate Limits 文檔](https://platform.claude.com/docs/en/api/rate-limits)
- [Anthropic API 錯誤處理](https://platform.claude.com/docs/en/api/errors)
