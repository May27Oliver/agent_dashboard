import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PtyExecutor } from './pty-executor';
import { Agent, AgentConfig, AgentStatus } from '../types';
import { AgentEntity } from '../entities';

export interface AgentInstance {
  agent: Agent;
  pty: PtyExecutor;
}

@Injectable()
export class AgentService implements OnModuleInit {
  private agents: Map<string, AgentInstance> = new Map();
  private outputCallbacks: Map<string, (agentId: string, data: string) => void> = new Map();
  private statusCallbacks: Map<string, (agent: Agent) => void> = new Map();
  // Agent 完成時的回調 (用於通知 Workflow)
  private agentCompleteCallbacks: Map<string, (agentId: string, exitCode: number) => void> = new Map();

  constructor(
    @InjectRepository(AgentEntity)
    private readonly agentRepository: Repository<AgentEntity>,
  ) {}

  async onModuleInit() {
    // 不再清除 agents，改為由 Gateway 調用 restoreAgents() 恢復
  }

  /**
   * 恢復資料庫中已存在的 agents
   * 由 AgentGateway 在初始化後調用，確保 WebSocket callbacks 可用
   */
  async restoreAgents(
    onOutput: (agentId: string, data: string) => void,
    onStatusChange: (agent: Agent) => void,
  ): Promise<Agent[]> {
    const savedAgents = await this.agentRepository.find();
    const restoredAgents: Agent[] = [];

    for (const entity of savedAgents) {
      // 檢查是否已經在記憶體中
      if (this.agents.has(entity.id)) continue;

      const agent: Agent = {
        id: entity.id,
        name: entity.name,
        role: entity.role as Agent['role'],
        status: 'idle',
        cwd: entity.cwd,
        createdAt: entity.createdAt.getTime(),
        workflowId: entity.workflowId,
      };

      let pty: PtyExecutor;
      pty = new PtyExecutor({
        cwd: entity.cwd,
        useClaudeCli: true,
        onData: (data) => onOutput(entity.id, data),
        onExit: async (code) => {
          const instance = this.agents.get(entity.id);
          if (!instance) return;

          // 確保這是當前 PTY 的 exit，不是被 restart 的舊 PTY
          if (instance.pty !== pty) return;

          instance.agent.status = code === 0 ? 'success' : 'error';
          await this.agentRepository.update(entity.id, { status: instance.agent.status });
          onStatusChange(instance.agent);

          // 通知 Workflow (如果有註冊回調)
          const completeCallback = this.agentCompleteCallbacks.get(entity.id);
          if (completeCallback) {
            completeCallback(entity.id, code);
          }
        },
      });

      this.agents.set(entity.id, { agent, pty });
      this.outputCallbacks.set(entity.id, onOutput);
      this.statusCallbacks.set(entity.id, onStatusChange);

      // 更新資料庫中的狀態為 idle
      await this.agentRepository.update(entity.id, { status: 'idle' });
      restoredAgents.push(agent);
    }

    return restoredAgents;
  }

  async createAgent(
    config: AgentConfig,
    onOutput: (agentId: string, data: string) => void,
    onStatusChange: (agent: Agent) => void,
  ): Promise<Agent> {
    const id = uuidv4();
    const agent: Agent = {
      id,
      name: config.name,
      role: config.role,
      status: 'idle',
      cwd: config.cwd,
      env: config.env,
      createdAt: Date.now(),
      workflowId: config.workflowId,
    };

    let pty: PtyExecutor;
    pty = new PtyExecutor({
      cwd: config.cwd,
      env: config.env,
      useClaudeCli: config.useClaudeCli ?? true, // 預設使用 Claude CLI
      onData: (data) => {
        const callback = this.outputCallbacks.get(id);
        if (callback) {
          callback(id, data);
        }
      },
      onExit: async (code) => {
        const instance = this.agents.get(id);
        if (!instance) {
          console.error(`[AgentService] Agent ${id} not found on exit - possible race condition`);
          return;
        }

        // 確保這是當前 PTY 的 exit，不是被 restart 的舊 PTY
        if (instance.pty !== pty) {
          return;
        }

        instance.agent.status = code === 0 ? 'success' : 'error';

        // 更新資料庫中的狀態
        await this.agentRepository.update(id, { status: instance.agent.status });

        const statusCallback = this.statusCallbacks.get(id);
        if (statusCallback) {
          statusCallback(instance.agent);
        }

        // 通知 Workflow (如果有註冊回調)
        const completeCallback = this.agentCompleteCallbacks.get(id);
        if (completeCallback) {
          completeCallback(id, code);
          // 不刪除 callback，允許多次觸發 (例如重試)
        }
      },
    });

    this.agents.set(id, { agent, pty });
    this.outputCallbacks.set(id, onOutput);
    this.statusCallbacks.set(id, onStatusChange);

    // 保存到資料庫
    const agentEntity = this.agentRepository.create({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      cwd: agent.cwd,
      workflowId: agent.workflowId,
    });
    await this.agentRepository.save(agentEntity);

    return agent;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id)?.agent;
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values()).map((instance) => instance.agent);
  }

  async getAllAgentsFromDb(): Promise<Agent[]> {
    const entities = await this.agentRepository.find();
    return entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      role: entity.role as Agent['role'],
      status: entity.status as Agent['status'],
      cwd: entity.cwd,
      createdAt: entity.createdAt.getTime(),
      workflowId: entity.workflowId,
    }));
  }

  executeCommand(agentId: string, command: string): boolean {
    const instance = this.agents.get(agentId);
    if (!instance) {
      return false;
    }

    instance.agent.status = 'running';
    const statusCallback = this.statusCallbacks.get(agentId);
    if (statusCallback) {
      statusCallback(instance.agent);
    }

    instance.pty.write(command + '\n');
    return true;
  }

  writeInput(agentId: string, data: string): boolean {
    const instance = this.agents.get(agentId);
    if (!instance) {
      return false;
    }

    instance.pty.write(data);
    return true;
  }

  resizeTerminal(agentId: string, cols: number, rows: number): boolean {
    const instance = this.agents.get(agentId);
    if (!instance) {
      return false;
    }

    instance.pty.resize(cols, rows);
    return true;
  }

  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<boolean> {
    const instance = this.agents.get(agentId);
    if (!instance) {
      return false;
    }

    instance.agent.status = status;

    // 更新資料庫
    await this.agentRepository.update(agentId, { status });

    const statusCallback = this.statusCallbacks.get(agentId);
    if (statusCallback) {
      statusCallback(instance.agent);
    }
    return true;
  }

  async removeAgent(id: string): Promise<boolean> {
    const instance = this.agents.get(id);
    if (!instance) {
      return false;
    }

    instance.pty.kill();
    this.agents.delete(id);
    this.outputCallbacks.delete(id);
    this.statusCallbacks.delete(id);
    this.agentCompleteCallbacks.delete(id);

    // 從資料庫刪除
    await this.agentRepository.delete(id);

    return true;
  }

  getPtyInstance(agentId: string): PtyExecutor | undefined {
    return this.agents.get(agentId)?.pty;
  }

  /**
   * 註冊 Agent 完成時的回調
   * 用於通知 WorkflowService agent 已完成執行
   */
  registerAgentCompleteCallback(
    agentId: string,
    callback: (agentId: string, exitCode: number) => void,
  ): void {
    this.agentCompleteCallbacks.set(agentId, callback);
  }

  /**
   * 取消註冊 Agent 完成回調
   */
  unregisterAgentCompleteCallback(agentId: string): void {
    this.agentCompleteCallbacks.delete(agentId);
  }

  /**
   * 檢查 Agent 是否有註冊完成回調
   */
  hasAgentCompleteCallback(agentId: string): boolean {
    return this.agentCompleteCallbacks.has(agentId);
  }

  /**
   * 重啟 Agent 的終端和 Claude Code
   * 終止現有的 PTY 進程，創建新的 PTY 進程
   */
  restartAgent(agentId: string): boolean {
    const instance = this.agents.get(agentId);
    if (!instance) {
      return false;
    }

    const { agent, pty: oldPty } = instance;

    // 取得現有的回調
    const outputCallback = this.outputCallbacks.get(agentId);
    const statusCallback = this.statusCallbacks.get(agentId);

    if (!outputCallback || !statusCallback) {
      return false;
    }

    // 創建新的 PTY 進程（在 kill 舊的之前，這樣舊的 onExit 檢查 pty 時會發現不匹配）
    const newPty = new PtyExecutor({
      cwd: agent.cwd,
      env: agent.env,
      useClaudeCli: true,
      onData: (data) => {
        const callback = this.outputCallbacks.get(agentId);
        if (callback) {
          callback(agentId, data);
        }
      },
      onExit: (code) => {
        const currentInstance = this.agents.get(agentId);
        if (!currentInstance) {
          console.error(`[AgentService] Agent ${agentId} not found on exit - possible race condition`);
          return;
        }

        // 確保這是當前 PTY 的 exit，不是被 restart 的舊 PTY
        if (currentInstance.pty !== newPty) {
          return;
        }

        currentInstance.agent.status = code === 0 ? 'success' : 'error';
        const callback = this.statusCallbacks.get(agentId);
        if (callback) {
          callback(currentInstance.agent);
        }

        // 通知 Workflow (如果有註冊回調)
        const completeCallback = this.agentCompleteCallbacks.get(agentId);
        if (completeCallback) {
          completeCallback(agentId, code);
        }
      },
    });

    // 先更新實例的 pty，這樣舊的 onExit 會因為 pty 不匹配而被忽略
    instance.pty = newPty;

    // 終止舊的 PTY 進程
    oldPty.kill();

    // 更新 Agent 狀態
    agent.status = 'idle';

    // 更新資料庫
    this.agentRepository.update(agentId, { status: 'idle' });

    // 通知狀態變更
    statusCallback(agent);

    return true;
  }
}
