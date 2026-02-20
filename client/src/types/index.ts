export const AGENT_ROLES = ['PM', 'UIUX', 'RD', 'TEST', 'REVIEW', 'QA', 'CUSTOM'] as const;
export type AgentRole = typeof AGENT_ROLES[number];
export type AgentStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting';
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  cwd?: string;
  env?: Record<string, string>;
  createdAt: number;
  workflowId?: string; // 所屬 Workflow ID
}

export interface AgentConfig {
  name: string;
  role: AgentRole;
  cwd?: string;
  env?: Record<string, string>;
  useClaudeCli?: boolean; // 是否使用 Claude CLI 模式（預設 true）
  workflowId?: string; // 所屬 Workflow ID
}

export interface TerminalOutput {
  agentId: string;
  data: string;
  timestamp: number;
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  command: string;
  dependsOn?: string[];
  onSuccess?: string;
  onFailure?: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped' | 'awaiting_approval';
  // Collaborative workflow fields
  requiresApproval?: boolean;
  approvalStatus?: ApprovalStatus;
  approvalComment?: string;
  inputArtifacts?: string[];
  outputArtifacts?: string[];
  role?: AgentRole;
}

export interface WorkflowDefinition {
  id?: string;
  name: string;
  steps: Omit<WorkflowStep, 'status'>[];
  projectPath?: string; // 所屬專案路徑
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused' | 'awaiting_approval';
  currentStepId?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  // Collaborative workflow fields
  featureName?: string;
  specDirectory?: string;
  variables?: Record<string, string>;
  artifacts?: WorkflowArtifact[];
  projectPath?: string; // 所屬專案路徑
}

export interface WorkflowArtifact {
  id: string;
  stepId: string;
  role: AgentRole;
  filePath: string;
  createdAt: number;
}

export interface CollaborativeWorkflowDefinition {
  name: string;
  featureName: string;
  specDirectory?: string;
  variables?: Record<string, string>;
  steps: CollaborativeStepDefinition[];
}

export interface CollaborativeStepDefinition {
  id: string;
  agentId?: string; // 可選，後端自動填入
  role: AgentRole;
  command: string;
  requiresApproval?: boolean;
  inputArtifacts?: string[];
  outputArtifacts?: string[];
  dependsOn?: string[];
}

// 前端發送的 Collaborative Workflow 請求
export interface CollaborativeWorkflowRequest {
  name: string;
  featureName: string;
  projectPath: string;
  roles: {
    role: AgentRole;
    enabled: boolean;
    requiresApproval: boolean;
    customPrompt?: string;
  }[];
}

export interface ApprovalRequest {
  workflowId: string;
  stepId: string;
  stepRole: AgentRole;
  featureName: string;
  outputArtifacts: string[];
  timestamp: number;
}

// Rate Limit (from Anthropic API)
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

// 用戶方案設定
export type ClaudePlan = 'pro' | 'max5' | 'max20' | 'custom';

export interface UserSettings {
  claudePlan: ClaudePlan;
  customPromptLimit?: number;  // 自訂 prompt 限制
}

// Active Project
export interface ActiveProject {
  path: string;
  name: string;
  baseDir: string;
  baseDirLabel: string;
}

// Full Settings (stored in database)
export interface FullSettings {
  id: string;
  theme: 'dark' | 'light';
  terminalFontSize: number;
  autoScroll: boolean;
  showTimestamps: boolean;
  maxLogEntries: number;
  socketUrl: string;
  projectDirs: string[];
  activeProjects: ActiveProject[];
  expandedActiveProjects: string[];
  claudePlan: ClaudePlan;
  customPromptLimit: number | null;
  collapsedPanels: Record<string, boolean>;
}

// Claude Usage (local usage stats)
export interface ClaudeUsageInfo {
  todayTokens: number;
  todayInputTokens: number;
  todayOutputTokens: number;
  todayCacheReadTokens: number;
  todayCacheCreationTokens: number;
  todayRequests: number;
  todaySessions: number;
  // 新增 Prompt 使用量
  promptUsage: PromptUsageInfo;
  lastUpdated: number;
}

// System Status
export interface SystemStats {
  cpu: number;
  memory: number;
  activePty: number;
  wsConnections: number;
  uptime: number;
  claudeUsage: ClaudeUsageInfo;
  rateLimit: RateLimitInfo | null;
}

// Event Log
export type EventLogLevel = 'info' | 'success' | 'warning' | 'error';
export interface EventLog {
  id: string;
  timestamp: number;
  level: EventLogLevel;
  message: string;
  source?: string;
}

// Navigation
export type TabType = 'dashboard' | 'settings';
export type ConnectionStatus = 'online' | 'offline' | 'connecting';

// Task
export type TaskStatus = 'all' | 'pending' | 'active' | 'done';
export interface Task {
  id: string;
  label: string;
  status: TaskStatus;
  agentId?: string;
}
