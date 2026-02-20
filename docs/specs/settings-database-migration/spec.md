# Settings 資料庫遷移規格書

## 目標
將前端 localStorage 的設定資料遷移到 PostgreSQL 資料庫存儲。

---

## Database Schema

### Table: `user_settings`

| 欄位名稱 | 類型 | 預設值 | 說明 |
|---------|------|--------|------|
| `id` | VARCHAR(50) | 'default' | Primary Key，用戶識別 |
| `theme` | VARCHAR(10) | 'dark' | 主題：'dark' \| 'light' |
| `terminal_font_size` | INTEGER | 13 | 終端字體大小 (10-20) |
| `auto_scroll` | BOOLEAN | true | 自動滾動至最新輸出 |
| `show_timestamps` | BOOLEAN | true | 事件日誌顯示時間戳 |
| `max_log_entries` | INTEGER | 100 | 最大日誌條目數 (50-500) |
| `socket_url` | VARCHAR(255) | 'http://localhost:3001' | WebSocket 伺服器 URL |
| `project_dirs` | JSONB | [] | 專案目錄列表 `string[]` |
| `claude_plan` | VARCHAR(20) | 'max20' | Claude 方案：'pro' \| 'max5' \| 'max20' \| 'custom' |
| `custom_prompt_limit` | INTEGER | NULL | 自訂 prompt 限制（nullable） |
| `active_projects` | JSONB | [] | 活動專案列表 `ActiveProject[]` |
| `expanded_active_projects` | JSONB | [] | 展開的專案路徑 `string[]` |
| `collapsed_panels` | JSONB | {} | 面板收合狀態 `Record<string, boolean>` |
| `created_at` | TIMESTAMP | NOW() | 建立時間 |
| `updated_at` | TIMESTAMP | NOW() | 更新時間 |

### JSONB 欄位結構說明

```typescript
// project_dirs
["~/Documents/learn", "~/Documents/work"]

// active_projects
[
  {
    "path": "/Users/xxx/Documents/learn/project-a",
    "name": "project-a",
    "baseDir": "/Users/xxx/Documents/learn",
    "baseDirLabel": "learn"
  }
]

// expanded_active_projects
["/Users/xxx/Documents/learn/project-a"]

// collapsed_panels
{
  "system-status": true,
  "event-log": false
}
```

---

## 修改檔案清單

### 後端 (Server)

| 檔案 | 動作 | 說明 |
|------|------|------|
| `server/src/entities/user-settings.entity.ts` | 新增 | UserSettingsEntity 定義 |
| `server/src/entities/index.ts` | 修改 | 導出新 entity |
| `server/src/system/user-settings.service.ts` | 新增 | CRUD 服務 |
| `server/src/system/system.module.ts` | 修改 | 註冊 TypeORM + Service |
| `server/src/system/system.gateway.ts` | 修改 | 使用新 Service，擴展 API |
| `server/src/app.module.ts` | 修改 | 註冊 UserSettingsEntity |

### 前端 (Client)

| 檔案 | 動作 | 說明 |
|------|------|------|
| `client/src/types/index.ts` | 修改 | 擴展 Settings 類型定義 |
| `client/src/hooks/useSocket.ts` | 修改 | 新增完整 settings API |
| `client/src/pages/SettingsPage.tsx` | 修改 | 移除 localStorage，使用 API |
| `client/src/store/uiStore.ts` | 修改 | 移除 localStorage，使用 API |
| `client/src/utils/storage.ts` | 刪除 | 不再需要 |

---

## WebSocket API 設計

### 事件列表

| 事件 | 方向 | Payload | 說明 |
|------|------|---------|------|
| `settings:get` | Client → Server | `void` | 請求完整設定 |
| `settings:response` | Server → Client | `FullSettings` | 返回完整設定 |
| `settings:update` | Client → Server | `Partial<FullSettings>` | 更新部分設定 |
| `settings:updated` | Server → All Clients | `FullSettings` | 廣播設定更新 |

### FullSettings 類型

```typescript
interface FullSettings {
  // Appearance
  theme: 'dark' | 'light';
  terminalFontSize: number;

  // Behavior
  autoScroll: boolean;
  showTimestamps: boolean;
  maxLogEntries: number;

  // Connection
  socketUrl: string;

  // Projects
  projectDirs: string[];
  activeProjects: ActiveProject[];
  expandedActiveProjects: string[];

  // Claude Plan
  claudePlan: ClaudePlan;
  customPromptLimit?: number;

  // UI State
  collapsedPanels: Record<string, boolean>;
}
```

---

## 實作步驟

1. **後端 Entity** - 建立 `UserSettingsEntity`
2. **後端 Service** - 建立 `UserSettingsService` (CRUD)
3. **後端 Gateway** - 修改 `SystemGateway` 使用新 Service
4. **前端 Types** - 擴展類型定義
5. **前端 Hook** - 修改 `useSocket` 添加 settings API
6. **前端 Store** - 修改 `uiStore` 從 API 載入/保存
7. **前端 Page** - 修改 `SettingsPage` 使用 API
8. **清理** - 刪除 `storage.ts`，移除 localStorage 相關程式碼

---

## 驗證方式

1. 啟動 PostgreSQL，確認 `user_settings` 表已建立
2. 開啟 Settings 頁面，修改設定
3. 重新整理頁面，確認設定保持
4. 檢查資料庫，確認資料正確寫入
5. 確認 localStorage 無相關資料殘留
