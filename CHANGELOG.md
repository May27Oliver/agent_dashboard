# Claude Cockpit - 開發紀錄

## 任務列表 (Tasks)

| # | 任務 | 狀態 | 說明 |
|---|------|------|------|
| 1 | Initialize server project with NestJS | ✅ 完成 | 建立 NestJS 專案結構、安裝依賴 |
| 2 | Initialize client project with Vite + React + TypeScript | ✅ 完成 | 使用 Vite 建立 React 專案、設定 Tailwind CSS v4 |
| 3 | Define shared TypeScript types | ✅ 完成 | 定義 Agent、Workflow、TerminalOutput 等型別 |
| 4 | Implement PtyExecutor class | ✅ 完成 | 使用 node-pty 實作 PTY 執行器 |
| 5 | Implement AgentManager class | ✅ 完成 | 實作 Agent 生命週期管理服務 |
| 6 | Implement WebSocket handler and server entry | ✅ 完成 | 建立 NestJS WebSocket Gateway |
| 7 | Implement frontend components | ✅ 完成 | 實作 XTerminal、AgentCard、Dashboard 等組件 |
| 8 | Implement Zustand store and Socket hooks | ✅ 完成 | 實作前端狀態管理與 Socket.io 連接 |
| 9 | Implement WorkflowOrchestrator | ✅ 完成 | 實作工作流狀態機與視覺化組件 |

---

## 工作項目明細

### Phase 1: 專案初始化

#### Server 初始化
- [x] 建立 `server/` 目錄結構
- [x] 初始化 `package.json`
- [x] 設定 `tsconfig.json` (啟用 decorators)
- [x] 設定 `nest-cli.json`
- [x] 安裝依賴：
  - `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`
  - `@nestjs/websockets`, `@nestjs/platform-socket.io`
  - `node-pty`, `socket.io`, `uuid`, `reflect-metadata`, `rxjs`
  - Dev: `typescript`, `ts-node`, `tsconfig-paths`, `nodemon`

#### Client 初始化
- [x] 使用 `npm create vite@latest` 建立 React + TypeScript 專案
- [x] 安裝依賴：
  - `@xterm/xterm`, `@xterm/addon-fit`
  - `socket.io-client`
  - `zustand`
- [x] 設定 Tailwind CSS v4：
  - 安裝 `tailwindcss`, `@tailwindcss/vite`
  - 更新 `vite.config.ts` 加入 Tailwind plugin
  - 更新 `index.css` 使用 `@import "tailwindcss"`

---

### Phase 2: Server 核心實作

#### 檔案清單
```
server/src/
├── types/
│   └── index.ts              # 共用型別定義
├── agent/
│   ├── pty-executor.ts       # PTY 執行器
│   ├── agent.service.ts      # Agent 管理服務
│   ├── agent.gateway.ts      # Agent WebSocket Gateway
│   └── agent.module.ts       # Agent Module
├── workflow/
│   ├── workflow.service.ts   # 工作流服務
│   ├── workflow.gateway.ts   # Workflow WebSocket Gateway
│   └── workflow.module.ts    # Workflow Module
├── app.module.ts             # 根 Module
└── main.ts                   # 應用入口
```

#### PtyExecutor (`server/src/agent/pty-executor.ts`)
- [x] 使用 `node-pty` 開啟偽終端
- [x] 支援環境變數隔離
- [x] 監聽 `onData` 事件傳出原始輸出
- [x] 監聽 `onExit` 事件處理進程結束
- [x] 實作 `write()` 方法模擬輸入
- [x] 實作 `resize()` 方法調整終端大小
- [x] 實作 `kill()` 方法終止進程

#### AgentService (`server/src/agent/agent.service.ts`)
- [x] 管理多個 Agent 實例
- [x] `createAgent()` - 建立 Agent 與對應的 PtyExecutor
- [x] `getAgent()` / `getAllAgents()` - 查詢 Agent
- [x] `executeCommand()` - 執行命令
- [x] `writeInput()` - 寫入終端輸入
- [x] `resizeTerminal()` - 調整終端大小
- [x] `updateAgentStatus()` - 更新狀態
- [x] `removeAgent()` - 移除 Agent

#### AgentGateway (`server/src/agent/agent.gateway.ts`)
- [x] WebSocket 事件處理：
  - `agent:create` - 建立新 Agent
  - `agent:command` - 發送命令
  - `agent:input` - 終端輸入
  - `agent:resize` - 調整大小
  - `agent:remove` - 移除 Agent
  - `agent:list` - 列出所有 Agent
- [x] 推送事件：
  - `agent:created` / `agent:updated` / `agent:removed`
  - `agent:output` - 終端輸出

#### WorkflowService (`server/src/workflow/workflow.service.ts`)
- [x] `createWorkflow()` - 建立工作流
- [x] `start()` / `pause()` / `resume()` / `stop()` - 控制工作流
- [x] `handleStepComplete()` - 處理步驟完成
- [x] `executeNextStep()` - 執行下一步驟
- [x] 依賴關係處理 (`dependsOn`)
- [x] 成功/失敗處理邏輯 (`onSuccess` / `onFailure`)
- [x] 簡易輸出分析 (`analyzeOutput`)

#### WorkflowGateway (`server/src/workflow/workflow.gateway.ts`)
- [x] WebSocket 事件處理：
  - `workflow:create` / `workflow:start` / `workflow:pause`
  - `workflow:resume` / `workflow:stop` / `workflow:stepComplete`
  - `workflow:list` / `workflow:get`
- [x] 推送事件：
  - `workflow:created` / `workflow:updated`
  - `workflow:stepChanged`

---

### Phase 3: Client 前端實作

#### 檔案清單
```
client/src/
├── types/
│   └── index.ts              # 型別定義
├── store/
│   └── agentStore.ts         # Zustand 狀態管理
├── hooks/
│   └── useSocket.ts          # Socket.io Hook
├── components/
│   ├── Terminal/
│   │   └── XTerminal.tsx     # xterm.js 封裝
│   ├── Agent/
│   │   ├── AgentCard.tsx     # Agent 卡片
│   │   └── AgentStatus.tsx   # 狀態指示器
│   ├── Workflow/
│   │   └── WorkflowDiagram.tsx # 工作流視覺化
│   └── Layout/
│       ├── Dashboard.tsx     # 主儀表板
│       └── Sidebar.tsx       # 側邊欄
├── App.tsx
├── main.tsx
└── index.css                 # Tailwind 樣式
```

#### Zustand Store (`client/src/store/agentStore.ts`)
- [x] 管理 `agents` Map
- [x] 管理 `terminalOutputs` Map
- [x] 管理 `workflows` Map
- [x] Actions: `addAgent`, `updateAgent`, `removeAgent`
- [x] Actions: `appendOutput`, `clearOutput`
- [x] Actions: `addWorkflow`, `updateWorkflow`, `updateWorkflowStep`

#### useSocket Hook (`client/src/hooks/useSocket.ts`)
- [x] 自動連接 Socket.io server
- [x] 監聽所有 server 事件並更新 store
- [x] 提供 API：
  - `createAgent`, `sendCommand`, `sendInput`
  - `resizeTerminal`, `removeAgent`
  - `createWorkflow`, `startWorkflow`, `pauseWorkflow`
  - `resumeWorkflow`, `stopWorkflow`, `markStepComplete`

#### XTerminal 組件 (`client/src/components/Terminal/XTerminal.tsx`)
- [x] 封裝 `@xterm/xterm`
- [x] 使用 `@xterm/addon-fit` 自適應大小
- [x] 自訂暗色主題
- [x] 監聽 `onData` 傳遞使用者輸入
- [x] 使用 ResizeObserver 監聽容器大小變化
- [x] 提供 `writeToTerminal()` helper function

#### AgentCard 組件 (`client/src/components/Agent/AgentCard.tsx`)
- [x] 顯示 Agent 名稱、角色、狀態
- [x] 角色顏色標籤 (PM/RD/TEST/REVIEW/QA/CUSTOM)
- [x] 內嵌 XTerminal 組件
- [x] 命令輸入框
- [x] 摺疊/展開功能
- [x] 移除按鈕

#### AgentStatus 組件 (`client/src/components/Agent/AgentStatus.tsx`)
- [x] 狀態指示燈動畫
- [x] 五種狀態：idle, running, success, error, waiting
- [x] 支援 sm/md/lg 尺寸

#### WorkflowDiagram 組件 (`client/src/components/Workflow/WorkflowDiagram.tsx`)
- [x] 視覺化顯示工作流步驟
- [x] 步驟狀態顏色與圖示
- [x] 步驟間箭頭連接
- [x] 顯示時間戳記

#### Sidebar 組件 (`client/src/components/Layout/Sidebar.tsx`)
- [x] Logo 與標題
- [x] "New Agent" 按鈕
- [x] "Sample Workflow" 按鈕
- [x] Agent 建立表單 (名稱、角色選擇)

#### Dashboard 組件 (`client/src/components/Layout/Dashboard.tsx`)
- [x] Grid 佈局顯示多個 Agent 卡片
- [x] 工作流區塊
- [x] 響應式設計 (1-2 columns)
- [x] 空狀態提示

---

### Phase 4: 專案配置

#### 根目錄 (`agent_dashboard/`)
- [x] 建立 `package.json` 統一管理
- [x] 設定 scripts：
  - `npm run dev` - 同時啟動 server + client
  - `npm run build` - 建置兩個專案
  - `npm run install:all` - 安裝所有依賴
- [x] 安裝 `concurrently` 用於並行執行

#### 文件
- [x] `README.md` - 專案說明文件
- [x] `CHANGELOG.md` - 開發紀錄 (本文件)

---

## 型別定義

```typescript
// Agent 角色
type AgentRole = 'PM' | 'RD' | 'TEST' | 'REVIEW' | 'QA' | 'CUSTOM';

// Agent 狀態
type AgentStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting';

// Agent 介面
interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  cwd?: string;
  env?: Record<string, string>;
  createdAt: number;
}

// 終端輸出
interface TerminalOutput {
  agentId: string;
  data: string;
  timestamp: number;
}

// 工作流步驟
interface WorkflowStep {
  id: string;
  agentId: string;
  command: string;
  dependsOn?: string[];
  onSuccess?: string;
  onFailure?: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped';
}

// 工作流
interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  currentStepId?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}
```

---

## 啟動指令

```bash
# 安裝所有依賴
npm run install:all

# 開發模式
npm run dev

# 或分別啟動
cd server && npm run start:dev  # Port 3001
cd client && npm run dev        # Port 5173
```

---

## 待辦事項 (Future)

- [ ] 多帳戶支援 (不同 HOME 目錄隔離)
- [ ] Claude Code 輸出解析器
- [ ] 命令歷史記錄
- [ ] 設定持久化 (JSON/SQLite)
- [ ] 工作流模板庫
- [ ] 拖拽式工作流編輯器
