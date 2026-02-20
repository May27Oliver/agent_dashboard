export type AgentRole = 'PM' | 'UIUX' | 'RD' | 'TEST' | 'REVIEW' | 'QA' | 'CUSTOM';
export type AgentStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting';
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';
export type SkillCategory = 'analysis' | 'creation' | 'delivery' | 'review';

// Agent Skill System
export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;

  // Skill 執行時的 prompt template
  promptTemplate: string;

  // 需要的輸入 (前一步的產出)
  requiredInputs?: string[]; // e.g., ['requirement_doc']

  // 產出的類型
  outputType?: string; // e.g., 'design_doc'

  // 產出檔案名稱 (用於 deliver-spec)
  outputFileName?: string; // e.g., '01-requirement.md'
}

export interface RoleSkillMapping {
  role: AgentRole;
  skills: AgentSkill[];
  defaultWorkflowSkill: string; // 在 workflow 中預設執行的 skill
}

export interface SkillConfig {
  outputFile: string; // 輸出檔案名稱
  inputArtifacts?: string[]; // 輸入檔案路徑
}

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
  // Skill 相關欄位
  skillId?: string; // 執行的 skill ID
  skillConfig?: SkillConfig;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  steps: Omit<WorkflowStep, 'status'>[];
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
  // Skill 相關欄位
  skillId?: string;
  skillConfig?: SkillConfig;
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

// Socket Events
export interface ServerToClientEvents {
  'agent:created': (agent: Agent) => void;
  'agent:updated': (agent: Agent) => void;
  'agent:removed': (agentId: string) => void;
  'agent:output': (output: TerminalOutput) => void;
  'workflow:updated': (workflow: Workflow) => void;
  'workflow:stepChanged': (payload: { workflowId: string; step: WorkflowStep }) => void;
  'workflow:approvalRequired': (payload: ApprovalRequest) => void;
}

export interface ApprovalRequest {
  workflowId: string;
  stepId: string;
  stepRole: AgentRole;
  featureName: string;
  outputArtifacts: string[];
  timestamp: number;
}

export interface ClientToServerEvents {
  'agent:create': (config: AgentConfig) => void;
  'agent:command': (payload: { agentId: string; command: string }) => void;
  'agent:input': (payload: { agentId: string; data: string }) => void;
  'agent:resize': (payload: { agentId: string; cols: number; rows: number }) => void;
  'agent:remove': (agentId: string) => void;
  'workflow:start': (definition: WorkflowDefinition) => void;
  'workflow:pause': (workflowId: string) => void;
  'workflow:resume': (workflowId: string) => void;
  'workflow:stop': (workflowId: string) => void;
  'workflow:createCollaborative': (request: CollaborativeWorkflowRequest) => void;
  'workflow:approve': (payload: { workflowId: string; stepId: string; comment?: string }) => void;
  'workflow:reject': (payload: { workflowId: string; stepId: string; comment: string; retry?: boolean }) => void;
}
