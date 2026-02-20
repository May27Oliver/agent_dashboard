# 功能規格書：Dashboard 可收合區塊與 Token 使用量儀表

## 概述

**功能名稱**：Dashboard 區塊收合功能與 Token 用量監控
**影響範圍**：
- `client/src/components/System/SystemStatusPanel.tsx`
- `client/src/components/Layout/Dashboard.tsx`
- `client/src/types/index.ts`

**優先級**：Medium

---

## 功能需求

### 1. 區塊收合功能

| 項目 | 說明 |
|------|------|
| **適用區塊** | System Status、Overview |
| **預設狀態** | 展開 |
| **收合按鈕位置** | 區塊標題列右側 |
| **動畫效果** | 平滑收合/展開（建議 200-300ms transition） |
| **狀態持久化** | 可選：localStorage 記住使用者偏好 |

**UI 示意**：

```
┌─────────────────────────────────────┐
│ SYSTEM STATUS                    [▼]│  ← 點擊可收合
├─────────────────────────────────────┤
│  (內容區域)                          │
└─────────────────────────────────────┘

收合後：
┌─────────────────────────────────────┐
│ SYSTEM STATUS                    [▶]│  ← 點擊可展開
└─────────────────────────────────────┘
```

---

### 2. Token 使用量顯示

**位置**：Overview 區塊內，現有統計數據下方

**顯示內容**：

| 欄位 | 說明 | 格式範例 |
|------|------|----------|
| Token 使用量 | 已用 / 上限 | `125,432 / 1,000,000` |
| 使用百分比 | 圓形或條狀進度條 | `12.5%` |
| 請求數 | 已用 / 上限 | `48 / 100 requests` |

**UI 示意**：

```
┌─────────────────────────────────────────────┐
│ OVERVIEW                                 [▼]│
├─────────────────────────────────────────────┤
│  Total Agents    Running    Workflows  Pending
│      3             2           1         0
├─────────────────────────────────────────────┤
│  TOKEN USAGE                                │
│  ┌────────────────────────────────────┐     │
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░ │     │
│  │ 125,432 / 1,000,000 tokens (12.5%) │     │
│  └────────────────────────────────────┘     │
│  Requests: 48 / 100                         │
└─────────────────────────────────────────────┘
```

---

### 3. Rate Limit 倒計時儀表

**位置**：緊鄰 Token 使用量顯示

**顯示內容**：

| 狀態 | 顯示方式 |
|------|----------|
| 正常 | 顯示距離重置的剩餘時間 `Resets in: 45m 32s` |
| 接近限制 (>80%) | 黃色警示 + 倒計時 |
| 達到限制 (100%) | 紅色警示 + 倒計時 + 「Rate Limited」標籤 |

**UI 示意**：

```
┌─────────────────────────────────────┐
│  ⏱ RATE LIMIT                       │
│  ┌─────────────┐                    │
│  │     ⟳      │  Resets in         │
│  │   45:32    │  45m 32s           │
│  │            │                    │
│  └─────────────┘                    │
│  Status: ● Normal                   │
└─────────────────────────────────────┘
```

**倒計時儀表選項**（擇一實作）：

- **Option A**：環形進度條 (類似現有 CircularGauge)
- **Option B**：線性倒計時條
- **Option C**：純文字倒計時 + 狀態標籤

---

## 數據結構

### 新增 `TokenUsage` 介面

```typescript
// client/src/types/index.ts

export interface TokenUsage {
  used: number;           // 已使用的 token 數
  limit: number;          // token 上限
  resetAt: number;        // Rate limit 重置時間 (Unix timestamp, ms)
  requestsUsed: number;   // 已使用的請求數
  requestsLimit: number;  // 請求數上限
}
```

### 擴展 `SystemStats` 介面

```typescript
export interface SystemStats {
  cpu: number;
  memory: number;
  activePty: number;
  wsConnections: number;
  uptime: number;
  accounts: number;
  tokenUsage?: TokenUsage;  // 新增欄位
}
```

---

## WebSocket 事件

後端需透過 `system:stats` 事件傳送 `tokenUsage` 資料：

```typescript
// 範例 payload
{
  cpu: 45,
  memory: 62,
  activePty: 3,
  wsConnections: 2,
  uptime: 3600,
  accounts: 1,
  tokenUsage: {
    used: 125432,
    limit: 1000000,
    resetAt: 1708425600000,  // Unix timestamp
    requestsUsed: 48,
    requestsLimit: 100
  }
}
```

---

## 驗收標準

### 收合功能

- [ ] System Status 區塊可點擊收合/展開
- [ ] Overview 區塊可點擊收合/展開
- [ ] 收合時有平滑動畫效果
- [ ] 收合圖示正確顯示（展開時 ▼，收合時 ▶）

### Token 使用量

- [ ] 顯示目前已使用的 token 數量
- [ ] 顯示 token 上限
- [ ] 顯示使用百分比（進度條或數字）
- [ ] 顯示請求數使用狀況
- [ ] 數字格式化（千分位）

### Rate Limit 倒計時

- [ ] 即時顯示距離重置的剩餘時間
- [ ] 每秒更新倒計時
- [ ] 超過 80% 使用量時顯示黃色警示
- [ ] 達到 100% 時顯示紅色警示
- [ ] 重置後自動歸零

---

## 設計建議

**配色方案（符合現有暗色主題）**：

| 狀態 | 文字顏色 | 背景顏色 |
|------|----------|----------|
| 正常 | `text-cyan-400` | `bg-cyan-500/20` |
| 警示 | `text-amber-400` | `bg-amber-500/20` |
| 危險 | `text-red-400` | `bg-red-500/20` |
| 進度條背景 | - | `bg-slate-700/50` |

**動畫**：

- 收合動畫：`transition-all duration-300 ease-in-out`
- 倒計時無需動畫（每秒更新數字即可）

---

## 相關檔案

| 檔案路徑 | 修改內容 |
|----------|----------|
| `client/src/types/index.ts` | 新增 `TokenUsage` 介面，擴展 `SystemStats` |
| `client/src/components/System/SystemStatusPanel.tsx` | 加入收合功能 |
| `client/src/components/Layout/Dashboard.tsx` | Overview 區塊加入收合功能、Token 顯示、Rate Limit 儀表 |

---

## 備註

1. 若後端尚未提供 `tokenUsage` 資料，前端應優雅處理（顯示「N/A」或隱藏該區塊）
2. 倒計時需考慮瀏覽器 tab 切換後的同步問題
3. 可考慮加入 localStorage 儲存收合狀態偏好

---

**規格書版本**：v1.0
**撰寫日期**：2026-02-19
**PM**：Claude

---

## UI/UX 設計規範

> 以下為 UI/UX 專業建議，供 RD 開發時參照

---

### 1. 收合區塊互動設計

#### 1.1 點擊熱區

| 項目 | 規範 |
|------|------|
| **可點擊區域** | 整個標題列皆可點擊，而非僅限箭頭圖示 |
| **最小高度** | 標題列高度 `40px`，確保觸控友善 |
| **游標樣式** | `cursor: pointer` 於整個標題列 |
| **Hover 效果** | 標題列背景加亮 `bg-slate-700/30` → `bg-slate-600/40` |

```
互動熱區示意：
┌───────────────────────────────────────┐
│ ← 整個標題列皆為可點擊區域 →        [▼]│
└───────────────────────────────────────┘
```

#### 1.2 動畫規格

| 屬性 | 值 |
|------|------|
| **展開/收合動畫** | `max-height` 搭配 `overflow: hidden` |
| **持續時間** | `250ms` |
| **緩動函數** | `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out) |
| **箭頭旋轉** | `transform: rotate(-90deg)` 收合時 |

```css
/* 建議 CSS */
.panel-content {
  transition: max-height 250ms cubic-bezier(0.4, 0, 0.2, 1),
              opacity 200ms ease-out;
}

.panel-content.collapsed {
  max-height: 0;
  opacity: 0;
}

.collapse-icon {
  transition: transform 200ms ease-out;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}
```

#### 1.3 視覺回饋

| 狀態 | 樣式 |
|------|------|
| **Default** | 箭頭 `text-slate-400` |
| **Hover** | 箭頭 `text-cyan-400` + 標題列微亮 |
| **Active (按下)** | 箭頭 `scale(0.9)` 短暫縮放 |
| **Focus (鍵盤)** | 外框 `ring-2 ring-cyan-500/50` |

---

### 2. Token 使用量視覺設計

#### 2.1 進度條規格

| 屬性 | 規範 |
|------|------|
| **高度** | `8px` |
| **圓角** | `4px` (full rounded) |
| **背景色** | `bg-slate-700/60` |
| **填充漸層** | 依使用率變色（見下表） |

**進度條漸層配色：**

| 使用率 | 漸層色 | Tailwind Class |
|--------|--------|----------------|
| 0-60% | 青色 | `from-cyan-500 to-cyan-400` |
| 61-80% | 黃色 | `from-amber-500 to-amber-400` |
| 81-100% | 紅色 | `from-red-500 to-red-400` |

```
視覺示意（60% 使用率）：
┌────────────────────────────────────────┐
│ ██████████████████████░░░░░░░░░░░░░░░░ │
└────────────────────────────────────────┘
   ↑ 漸層填充              ↑ 背景色
```

#### 2.2 數字排版

| 元素 | 字型規格 |
|------|----------|
| **已使用數字** | `text-xl font-semibold text-white` |
| **上限數字** | `text-sm text-slate-400` |
| **百分比** | `text-sm font-medium` + 狀態顏色 |
| **數字字型** | `font-mono` 確保等寬對齊 |

**格式範例：**
```
125,432 / 1,000,000 tokens (12.5%)
↑ 大字白色   ↑ 小字灰色      ↑ 狀態色
```

#### 2.3 區塊佈局

```
Token Usage 區塊結構：
┌─────────────────────────────────────────────────┐
│  TOKEN USAGE                                    │  ← 小標題 text-xs text-slate-500 uppercase
│                                                 │
│  125,432 / 1,000,000 tokens                     │  ← 主數字
│  ┌─────────────────────────────────────────┐    │
│  │ ████████████████░░░░░░░░░░░░░░░░░░░░░░░ │    │  ← 進度條
│  └─────────────────────────────────────────┘    │
│  12.5% used                                     │  ← 百分比標籤
│                                                 │
│  48 / 100 requests                              │  ← 次要指標
└─────────────────────────────────────────────────┘
```

**間距規範：**

| 間距 | 值 |
|------|------|
| 區塊內 padding | `16px` (`p-4`) |
| 標題與內容間距 | `12px` (`mb-3`) |
| 進度條與文字間距 | `8px` (`my-2`) |
| 主指標與次指標間距 | `16px` (`mt-4`) |

---

### 3. Rate Limit 倒計時設計

#### 3.1 建議採用 Option A：環形進度條

**理由：**
- 與現有 `CircularGauge` 風格一致
- 倒計時用環形視覺上更直觀（像時鐘）
- 佔用空間可控

**規格：**

| 屬性 | 值 |
|------|------|
| **直徑** | `64px` |
| **環寬** | `4px` |
| **背景環** | `stroke-slate-700` |
| **進度環** | 依狀態變色 |
| **動畫** | `stroke-dashoffset` 動態變化 |

#### 3.2 倒計時數字

| 狀態 | 顯示格式 |
|------|----------|
| ≥ 1 小時 | `1h 23m` |
| < 1 小時 | `45:32` (mm:ss) |
| < 1 分鐘 | `0:45` 紅色閃爍 |
| 已重置 | `Ready` 綠色 |

**數字樣式：**
- 字型：`font-mono text-lg font-semibold`
- 位置：環形中央
- 次要文字 "Resets in"：環形下方 `text-xs text-slate-500`

#### 3.3 狀態標籤設計

```
狀態標籤視覺：

正常：    ● Normal     → text-cyan-400 + 實心圓點
警示：    ● Warning    → text-amber-400 + 閃爍動畫
達限：    ● Limited    → text-red-400 + pulse 動畫
```

**狀態圓點動畫：**
```css
/* 警示狀態閃爍 */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.status-warning { animation: blink 1s ease-in-out infinite; }

/* 達限狀態脈動 */
.status-limited { animation: pulse 1.5s ease-in-out infinite; }
```

---

### 4. 響應式設計

#### 4.1 斷點行為

| 螢幕寬度 | Token 區塊行為 | Rate Limit 位置 |
|----------|---------------|-----------------|
| ≥ 1024px | 進度條全寬，數字左對齊 | Token 區塊右側 |
| 768-1023px | 同上 | Token 區塊下方 |
| < 768px | 進度條全寬，數字縮小 | Token 區塊下方，環形縮小至 48px |

#### 4.2 收合區塊響應式

| 螢幕寬度 | 預設收合狀態 |
|----------|--------------|
| ≥ 768px | 全部展開 |
| < 768px | 可考慮 System Status 預設收合 |

---

### 5. 可及性 (Accessibility)

#### 5.1 鍵盤操作

| 按鍵 | 行為 |
|------|------|
| `Tab` | 聚焦至收合按鈕 |
| `Enter` / `Space` | 切換展開/收合 |
| `Escape` | 無特殊行為 |

#### 5.2 ARIA 屬性

```html
<!-- 收合區塊 -->
<div role="region" aria-labelledby="system-status-heading">
  <button
    id="system-status-heading"
    aria-expanded="true"
    aria-controls="system-status-content"
  >
    SYSTEM STATUS
    <span aria-hidden="true">▼</span>
  </button>
  <div id="system-status-content" aria-hidden="false">
    <!-- 內容 -->
  </div>
</div>

<!-- 進度條 -->
<div
  role="progressbar"
  aria-valuenow="125432"
  aria-valuemin="0"
  aria-valuemax="1000000"
  aria-label="Token usage: 12.5%"
>
```

#### 5.3 螢幕閱讀器文案

| 元素 | 朗讀文案 |
|------|----------|
| 收合按鈕 | "System Status, 已展開, 按下收合" |
| Token 進度條 | "Token 使用量 12.5%，已使用 125,432，上限 1,000,000" |
| 倒計時 | "Rate limit 重置時間：45 分 32 秒" |
| 狀態標籤 | "狀態：正常" / "狀態：警告，接近使用上限" |

---

### 6. 載入與錯誤狀態

#### 6.1 載入中 (Loading)

```
Token 載入骨架：
┌─────────────────────────────────────────────────┐
│  TOKEN USAGE                                    │
│  ┌──────────────────┐ / ┌──────────────────┐    │  ← 骨架動畫
│  └──────────────────┘   └──────────────────┘    │
│  ┌─────────────────────────────────────────┐    │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │    │  ← shimmer 效果
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

骨架樣式：`bg-slate-700 animate-pulse rounded`

#### 6.2 無資料 / 錯誤

| 狀態 | 顯示內容 |
|------|----------|
| **無 tokenUsage 資料** | `--` 或隱藏整個區塊 |
| **API 錯誤** | 顯示 `Unable to load` + 重試按鈕 |
| **倒計時過期但未重置** | 顯示 `Refreshing...` |

---

### 7. 微交互細節

#### 7.1 數字變化動畫

Token 數字更新時建議使用：
- **方案 A (簡單)**：數字直接更新，無動畫
- **方案 B (進階)**：數字 count-up 動畫，約 `300ms`

若選擇方案 B：
```typescript
// 使用 requestAnimationFrame 或 react-countup 套件
const animateValue = (start: number, end: number, duration: number) => {
  // 數字從 start 漸變至 end
}
```

#### 7.2 進度條填充動畫

初次載入時，進度條應有填充動畫：
```css
.progress-fill {
  transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### 7.3 警示狀態提示

當使用率從 <80% 跨越到 ≥80% 時：
- 進度條顏色漸變（約 300ms）
- 可選：瀏覽器 Notification 或 Toast 提醒

---

### 8. 設計資產清單

| 元素 | 規格 | 來源 |
|------|------|------|
| 收合箭頭 | `ChevronDown` icon, 16x16 | Lucide / Heroicons |
| 狀態圓點 | 8x8 圓形 | CSS `rounded-full` |
| 時鐘圖示 | `Clock` icon, 16x16 (可選) | Lucide / Heroicons |
| 警示圖示 | `AlertTriangle`, 16x16 | Lucide / Heroicons |

---

### 9. 設計決策記錄

| 決策 | 建議選項 | 理由 |
|------|---------|------|
| 倒計時儀表樣式 | **Option A: 環形** | 與現有 CircularGauge 一致，視覺直觀 |
| 收合狀態持久化 | **實作 localStorage** | 提升 UX，記住用戶偏好 |
| 進度條顯示 | **線性進度條** | 空間利用率高，數據呈現清晰 |
| 點擊熱區 | **整個標題列** | 更易點擊，符合 Fitts's Law |

---

### 10. 視覺規格摘要表

| 項目 | 規格值 |
|------|--------|
| 標題列高度 | `40px` |
| 收合動畫時長 | `250ms` |
| 進度條高度 | `8px` |
| 環形儀表直徑 | `64px` |
| 環形線寬 | `4px` |
| 區塊內距 | `16px` |
| 元素間距 | `8px` / `12px` / `16px` |
| 圓角 | `8px` (區塊) / `4px` (進度條) |

---

**UI/UX 設計者**：Claude (UI/UX)
**設計版本**：v1.0
**日期**：2026-02-19
