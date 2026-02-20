# CLAUDE.md - Claude Cockpit Client

## Project Overview

Claude Cockpit 是一個多代理 CLI 管理儀表板，用於編排 Claude 代理的終端介面和工作流程管理。

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.9
- **Build Tool**: Vite 7.3
- **Styling**: Tailwind CSS 4.1
- **State Management**: Zustand 5.0
- **Terminal**: xterm.js 6.0
- **WebSocket**: Socket.IO Client 4.8

## Project Structure

```
src/
├── main.tsx              # 應用程式入口點
├── App.tsx               # 根元件，路由邏輯
├── index.css             # 全域樣式 + Tailwind
├── types/index.ts        # TypeScript 類型定義
├── store/                # Zustand 狀態管理
│   ├── uiStore.ts        # UI 狀態 (activeProjects, sidebar, selectedWorkflow)
│   ├── systemStore.ts    # 系統統計 & 事件日誌
│   └── agentStore.ts     # Agent, workflow, terminal 資料
├── hooks/
│   └── useSocket.ts      # WebSocket 連接 & 操作 (singleton pattern)
├── pages/
│   └── SettingsPage.tsx  # 設定頁面 (Claude Plan, 專案目錄等)
├── utils/
│   ├── format.ts         # 數字格式化
│   └── storage.ts        # localStorage 操作
└── components/
    ├── Layout/
    │   ├── MainLayout.tsx      # 主佈局 (sidebar + content)
    │   ├── Dashboard.tsx       # Dashboard 容器
    │   └── WorkflowSidebar.tsx # 專案/工作流程側邊欄
    ├── Navigation/
    │   ├── TopNavigation.tsx      # 頂部導航
    │   ├── Clock.tsx              # 時鐘元件
    │   └── ConnectionIndicator.tsx # 連線狀態指示器
    ├── Terminal/
    │   └── XTerminal.tsx    # xterm.js 終端封裝
    ├── Agent/
    │   ├── AgentCard.tsx    # Agent 卡片 (含終端)
    │   └── AgentStatus.tsx  # 狀態指示器
    ├── Workflow/
    │   ├── WorkflowDiagram.tsx           # 工作流程步驟圖
    │   ├── ApprovalPanel.tsx             # 審核面板
    │   └── CollaborativeWorkflowCreator.tsx # 建立工作流程
    ├── Dashboard/
    │   ├── DashboardOverview.tsx    # 儀表板總覽
    │   ├── SelectedWorkflowView.tsx # 選中工作流程詳情
    │   ├── TokenUsageDisplay.tsx    # Token 使用量顯示
    │   └── PromptGauge.tsx          # Prompt 使用量儀表
    ├── System/
    │   ├── SystemStatusPanel.tsx # 系統狀態面板
    │   └── CircularGauge.tsx     # 圓形儀表
    ├── Task/
    │   ├── TaskPanel.tsx   # 任務面板
    │   ├── TaskFilter.tsx  # 任務篩選
    │   └── TaskTag.tsx     # 任務標籤
    └── EventLog/
        ├── EventLogPanel.tsx # 事件日誌面板
        └── EventLogEntry.tsx # 日誌項目
```

## Development Commands

```bash
npm run dev      # 啟動開發伺服器 (port 5173)
npm run build    # TypeScript 編譯 + Vite 建置
npm run lint     # ESLint 檢查
npm run preview  # 預覽生產版本
```

## Architecture

### State Management (Zustand)

三個獨立 store：
- **uiStore** - UI 狀態 (activeProjects, expandedProjects, selectedWorkflowId, sidebarCollapsed)
- **systemStore** - 系統狀態 (connectionStatus, stats, logs)
- **agentStore** - Agent、工作流程、待審核項目

### WebSocket Events

**接收事件：**
- `system:stats`, `system:log` → systemStore
- `agent:sync`, `agent:created`, `agent:updated`, `agent:removed`, `agent:restarted` → agentStore
- `agent:output` → 終端輸出 (writeToTerminal)
- `workflow:sync`, `workflow:created`, `workflow:updated`, `workflow:stepChanged` → agentStore
- `workflow:approvalRequired` → 待審核項目

**發送事件：**
- Agent: `agent:create`, `agent:command`, `agent:input`, `agent:resize`, `agent:remove`, `agent:restart`
- Workflow: `workflow:create`, `workflow:createCollaborative`, `workflow:start`, `workflow:pause`, `workflow:resume`, `workflow:stop`, `workflow:stepComplete`, `workflow:approve`, `workflow:reject`
- Settings: `settings:get`, `settings:update`
- FileSystem: `fs:listDirs`

### Key Types

```typescript
type AgentRole = 'PM' | 'RD' | 'UIUX' | 'TEST' | 'REVIEW' | 'QA' | 'CUSTOM'
type AgentStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting'
type WorkflowStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused' | 'awaiting_approval'
type ClaudePlan = 'pro' | 'max5' | 'max20' | 'custom'
```

## Configuration

### Vite Config
- Path alias: `@` → `./src`
- Dev server proxy: `/socket.io` → `http://localhost:3001`

### Environment Variables
- `VITE_SOCKET_URL` - WebSocket 伺服器 URL (預設: `http://localhost:3001`)

## Development Guidelines

1. **元件模式** - 使用 Functional Components + Hooks + memo
2. **狀態管理** - 使用 Zustand，避免 prop drilling
3. **樣式** - 使用 Tailwind utilities，保持暗色主題一致性
4. **類型安全** - 嚴格模式 TypeScript，所有 props 需定義類型
5. **WebSocket** - 所有 socket 操作透過 `useSocket` hook (singleton pattern)
6. **終端** - 使用 `writeToTerminal` 函數寫入，透過 Map 管理多個終端實例

## Backend Connection

後端伺服器預期運行在 `http://localhost:3001`，提供：
- Socket.IO WebSocket 連接
- Agent 管理 API
- 終端 PTY 會話
- 工作流程執行引擎
- 設定存取 (settings:get/update)
- 檔案系統操作 (fs:listDirs)

## Code Style Notes

- 不使用 console.log (已清理)
- 錯誤處理使用空 catch block 或 silent fail
- 角色顏色定義在 `AgentCard.tsx` 的 `roleColors` 物件
- 工作流程狀態顏色定義在各元件的 `statusColorMap`
