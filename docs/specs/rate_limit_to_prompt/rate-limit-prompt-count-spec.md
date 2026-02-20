# Rate Limit 改為 Prompt 數量顯示 - 規格文件

## 背景

目前儀表板的 Rate Limit 顯示是基於 Anthropic API 響應頭的 token 數據：
- Requests 限制
- Input Tokens 限制
- Output Tokens 限制

但對於 Claude Pro/Max 用戶而言，實際的使用體驗是以 **Prompt 數量** 為單位（每 5 小時窗口可發送的對話次數），而非 token 數。

### 各方案的 Prompt 限制參考

| 方案 | 每 5 小時 Prompts | Token Window |
|------|------------------|--------------|
| Pro | 10-40 prompts | ~44,000 tokens |
| Max5 ($100/月) | 50-200 prompts | ~88,000 tokens |
| Max20 ($200/月) | 200-800 prompts | ~220,000 tokens |

---

## 需求目標

將 Rate Limit 顯示從 **token 為主** 改為 **prompt 數量為主**，讓用戶更直觀了解剩餘可用的對話次數。

---

## 設計方案

### 方案 A：基於本地日誌計算（推薦）

直接從 `.claude/projects/` 的 JSONL 日誌中計算用戶發送的 prompt 數量。

**優點：**
- 數據準確，來自實際使用紀錄
- 不依賴外部 API
- 可以計算各專案的 prompt 分布

**缺點：**
- 無法取得官方的 prompt 限制上限（需要用戶手動設定或估算）
- 需要估算 5 小時窗口的起始時間

### 方案 B：保留 Token + 新增 Prompt 估算

保留現有 token 顯示，額外新增 prompt 數量估算。

**計算方式：**
```
估算 Prompt 數 = Token 使用量 / 平均每 Prompt Token 數
```

---

## 實作規格

### 1. 資料模型變更

#### 新增 `PromptUsageInfo` 介面

```typescript
// server/src/system/claude-usage.service.ts
// client/src/types/index.ts

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
```

#### 更新 `ClaudeUsageInfo`

```typescript
export interface ClaudeUsageInfo {
  // 現有欄位...
  todayTokens: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayCacheReadTokens: number;
  todayCacheCreationTokens: number;
  todayRequests: number;
  todaySessions: number;

  // 新增欄位
  promptUsage: PromptUsageInfo;

  lastUpdated: number;
}
```

---

### 2. 後端服務變更

#### 檔案：`server/src/system/claude-usage.service.ts`

新增方法：

```typescript
/**
 * 計算 5 小時窗口內的 prompt 使用量
 * 窗口起始時間：以當前時間往前推算最近的 5 小時整點邊界
 */
private calculateWindowPrompts(): PromptUsageInfo {
  const now = Date.now();
  const WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours

  // 計算窗口起始時間（以 UTC 00:00, 05:00, 10:00, 15:00, 20:00 為邊界）
  const windowStart = this.getWindowStartTime(now);
  const windowEnd = windowStart + WINDOW_MS;

  // 從日誌計算窗口內的 prompt 數
  const windowPrompts = this.countPromptsInRange(windowStart, now);

  return {
    windowPrompts,
    windowLimit: this.getUserPromptLimit(), // 從設定讀取
    windowRemaining: this.getUserPromptLimit()
      ? this.getUserPromptLimit() - windowPrompts
      : null,
    windowResetTime: new Date(windowEnd).toISOString(),
    todayPrompts: this.countTodayPrompts(),
    hourlyBreakdown: this.getHourlyBreakdown(),
  };
}

/**
 * 計算指定時間範圍內的 prompt 數量
 * Prompt 定義：用戶發送的每一個 human 角色訊息
 */
private countPromptsInRange(startMs: number, endMs: number): number {
  // 遍歷所有專案的 JSONL 檔案
  // 計算時間範圍內 role: 'human' 的訊息數量
}
```

---

### 3. 前端元件變更

#### 檔案：`client/src/components/Dashboard/RateLimitGauge.tsx`

**改為 Prompt 為主的顯示：**

```tsx
interface PromptGaugeProps {
  promptUsage: PromptUsageInfo;
  rateLimit?: RateLimitInfo | null;  // 保留 token 資訊作為次要顯示
}

function PromptGauge({ promptUsage, rateLimit }: PromptGaugeProps) {
  const { windowPrompts, windowLimit, windowRemaining, windowResetTime } = promptUsage;

  // 主要顯示：Prompt 使用量
  // 圓形儀表盤顯示 prompt 使用百分比
  // 倒數計時顯示窗口重置時間

  // 次要顯示：Token 使用量（可摺疊）
}
```

**UI 設計：**

```
┌─────────────────────────────────────┐
│         Prompt 使用量                │
│                                     │
│      ┌─────────────────┐            │
│      │                 │            │
│      │   [圓形儀表盤]    │            │
│      │    45 / 200     │            │
│      │                 │            │
│      └─────────────────┘            │
│                                     │
│   剩餘: 155 prompts                 │
│   重置: 02:34:15                    │
│                                     │
│   ─────────────────────────         │
│   [展開] Token 詳情                  │
│     Input:  12,345 tokens           │
│     Output: 8,901 tokens            │
└─────────────────────────────────────┘
```

---

### 4. 設定功能

#### 新增用戶設定

讓用戶設定自己的方案限制：

```typescript
// server/src/config/user-settings.ts

export interface UserSettings {
  claudePlan: 'pro' | 'max5' | 'max20' | 'custom';
  customPromptLimit?: number;  // 自訂 prompt 限制
}
```

#### 設定 UI

在 Settings 頁面新增：

```
Claude 方案設定
──────────────────
○ Pro (~40 prompts/5hr)
○ Max 5x (~200 prompts/5hr)
● Max 20x (~800 prompts/5hr)
○ 自訂: [___] prompts/5hr
```

---

### 5. 5 小時窗口計算邏輯

```typescript
/**
 * 根據 Anthropic 的 5 小時滾動窗口計算
 *
 * 注意：實際的 Anthropic rate limit 是滾動窗口，
 * 但為了簡化，我們使用固定邊界：
 * UTC 00:00, 05:00, 10:00, 15:00, 20:00
 */
function getWindowStartTime(nowMs: number): number {
  const date = new Date(nowMs);
  const hours = date.getUTCHours();
  const windowStartHour = Math.floor(hours / 5) * 5;

  date.setUTCHours(windowStartHour, 0, 0, 0);
  return date.getTime();
}
```

---

## 檔案變更清單

| 檔案 | 變更類型 | 說明 |
|------|---------|------|
| `server/src/system/claude-usage.service.ts` | 修改 | 新增 prompt 計算邏輯 |
| `server/src/config/user-settings.ts` | 新增 | 用戶設定（方案選擇） |
| `client/src/types/index.ts` | 修改 | 新增 PromptUsageInfo 型別 |
| `client/src/components/Dashboard/RateLimitGauge.tsx` | 重構 | 改為 Prompt 為主的顯示 |
| `client/src/components/Dashboard/PromptGauge.tsx` | 新增 | 新的 Prompt 儀表盤元件 |
| `client/src/components/Settings/ClaudePlanSettings.tsx` | 新增 | 方案設定 UI |

---

## 實作優先順序

### Phase 1：基礎 Prompt 計算
1. 修改 `claude-usage.service.ts` 新增 prompt 計算
2. 更新型別定義
3. 更新 WebSocket 廣播數據

### Phase 2：UI 更新
1. 建立新的 `PromptGauge` 元件
2. 整合到 Dashboard
3. 保留 token 資訊作為次要顯示

### Phase 3：設定功能
1. 建立用戶設定服務
2. 建立設定 UI
3. 整合設定到 prompt 計算

---

## 開放問題

1. **窗口計算方式**：使用固定邊界 vs 真正的滾動窗口？
2. **Prompt 定義**：只計算 human 訊息，還是包含 tool_use 請求？
3. **多專案統計**：是否需要分專案顯示 prompt 使用量？
4. **歷史趨勢**：是否需要顯示過去幾個窗口的使用趨勢圖表？

---

## 相關參考

- [Claude Max vs Pro Rate Limits](https://hypereal.tech/a/weekly-rate-limits-claude-pro-max-guide)
- [Anthropic Rate Limit Headers](https://docs.anthropic.com/en/api/rate-limits)
