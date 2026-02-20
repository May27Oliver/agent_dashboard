# Claude Cockpit

Multi-Agent AI CLI Manager - 透過可視化介面管理多個 AI CLI 工具，實現 PM → RD → TEST 等多角色工作流自動化。

## 技術堆棧

- **Backend**: NestJS + TypeScript + node-pty + Socket.io
- **Frontend**: React + Vite + TypeScript + xterm.js + Zustand + Tailwind CSS

## 快速開始

### 安裝依賴

```bash
npm run install:all
```

### 開發模式

**方法一：使用啟動腳本 (推薦，僅限 macOS + iTerm)**

```bash
./start-dev.sh
```

此腳本會在 iTerm 中開啟兩個分頁，同時啟動前端和後端。

**方法二：使用 npm**

```bash
npm run dev
```

**方法三：手動分別啟動**

```bash
# Terminal 1 - Server (port 3001)
cd server && npm run start:dev

# Terminal 2 - Client (port 5173)
cd client && npm run dev
```

### 訪問

打開瀏覽器訪問 http://localhost:5173

## 功能

### Agent 管理
- 創建不同角色的 Agent (PM, RD, TEST, REVIEW, QA, CUSTOM)
- 每個 Agent 都有獨立的 PTY 終端
- 支援終端輸入/輸出、大小調整
- 即時狀態顯示 (idle, running, success, error, waiting)

### 工作流 (Workflow)
- 定義多步驟工作流
- 步驟間依賴關係
- 成功/失敗處理邏輯
- 視覺化工作流狀態

## 專案結構

```
agent_dashboard/
├── server/                    # NestJS 後端
│   └── src/
│       ├── agent/             # Agent 模組
│       │   ├── pty-executor.ts     # PTY 執行器
│       │   ├── agent.service.ts    # Agent 管理服務
│       │   ├── agent.gateway.ts    # WebSocket 網關
│       │   └── agent.module.ts
│       ├── workflow/          # 工作流模組
│       │   ├── workflow.service.ts
│       │   ├── workflow.gateway.ts
│       │   └── workflow.module.ts
│       ├── types/
│       └── main.ts
│
├── client/                    # React 前端
│   └── src/
│       ├── components/
│       │   ├── Terminal/      # xterm.js 封裝
│       │   ├── Agent/         # Agent 卡片組件
│       │   ├── Workflow/      # 工作流視覺化
│       │   └── Layout/        # 佈局組件
│       ├── hooks/             # useSocket 等
│       ├── store/             # Zustand 狀態管理
│       └── types/
│
└── package.json               # 根 package.json
```

## WebSocket 事件

### Client → Server
- `agent:create` - 建立新 Agent
- `agent:command` - 發送命令到 Agent
- `agent:input` - 發送終端輸入
- `agent:resize` - 調整終端大小
- `agent:remove` - 移除 Agent
- `workflow:create` - 建立工作流
- `workflow:start` - 啟動工作流
- `workflow:pause` / `workflow:resume` / `workflow:stop`

### Server → Client
- `agent:created` / `agent:updated` / `agent:removed`
- `agent:output` - 終端輸出
- `workflow:created` / `workflow:updated`
- `workflow:stepChanged` - 工作流步驟變更

## License

MIT
