import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AgentService } from './agent.service';
import { OutputBufferService } from './output-buffer.service';
import { WorkflowService } from '../workflow/workflow.service';
import { AgentConfig, Agent, TerminalOutput } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { expandTilde, isPathAllowed } from '../utils/shell';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    methods: ['GET', 'POST'],
  },
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private workflowService: WorkflowService | null = null;

  // 訂閱管理：追蹤哪些客戶端訂閱了哪些 agent
  private clientSubscriptions = new Map<string, Set<string>>(); // clientId -> Set<agentId>
  private agentSubscribers = new Map<string, Set<string>>();    // agentId -> Set<clientId>

  constructor(
    private readonly agentService: AgentService,
    private readonly outputBufferService: OutputBufferService,
  ) {}

  // WorkflowService 會在初始化後注入自己
  setWorkflowService(workflowService: WorkflowService) {
    this.workflowService = workflowService;
  }

  async afterInit() {
    // Gateway 初始化後恢復 agents
    const restoredAgents = await this.agentService.restoreAgents(
      (agentId, data) => {
        // 使用 OutputBuffer 累積輸出
        this.outputBufferService.append(agentId, data);
      },
      (updatedAgent) => {
        this.server.emit('agent:updated', updatedAgent);
      },
    );

    // 為恢復的 agents 註冊 output buffer
    for (const agent of restoredAgents) {
      this.registerAgentOutputBuffer(agent.id);
    }

    if (restoredAgents.length > 0) {
      console.log(`[AgentGateway] Restored ${restoredAgents.length} agents`);
    }
  }

  /**
   * 為 agent 註冊輸出緩衝區
   */
  private registerAgentOutputBuffer(agentId: string): void {
    this.outputBufferService.registerAgent(agentId, (data) => {
      this.emitToSubscribers(agentId, 'agent:output', {
        agentId,
        data,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * 只向訂閱了該 agent 的客戶端發送事件
   * 如果沒有訂閱者，則廣播給所有人（向下相容）
   */
  private emitToSubscribers(agentId: string, event: string, data: unknown): void {
    const subscribers = this.agentSubscribers.get(agentId);

    if (subscribers && subscribers.size > 0) {
      // 只發送給訂閱者
      for (const clientId of subscribers) {
        this.server.to(clientId).emit(event, data);
      }
    } else {
      // 向下相容：如果沒有訂閱機制，廣播給所有人
      this.server.emit(event, data);
    }
  }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);

    // Send sync event with all existing agents to newly connected client
    // This allows the client to clear any stale agents from previous sessions
    const agents = this.agentService.getAllAgents();
    client.emit('agent:sync', agents);

    // Send workflow sync event
    if (this.workflowService) {
      const workflows = await this.workflowService.getAllWorkflowsFromDb();
      client.emit('workflow:sync', workflows);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);

    // 清理該客戶端的所有訂閱
    const subscriptions = this.clientSubscriptions.get(client.id);
    if (subscriptions) {
      for (const agentId of subscriptions) {
        const subscribers = this.agentSubscribers.get(agentId);
        if (subscribers) {
          subscribers.delete(client.id);
          if (subscribers.size === 0) {
            this.agentSubscribers.delete(agentId);
          }
        }
      }
      this.clientSubscriptions.delete(client.id);
    }
  }

  @SubscribeMessage('agent:create')
  async handleCreateAgent(
    @MessageBody() config: AgentConfig,
    @ConnectedSocket() client: Socket,
  ): Promise<Agent> {
    console.log('[AgentGateway] Received agent:create event:', config);
    const agent = await this.agentService.createAgent(
      config,
      (agentId, data) => {
        // 使用 OutputBuffer 累積輸出
        this.outputBufferService.append(agentId, data);
      },
      (updatedAgent) => {
        this.server.emit('agent:updated', updatedAgent);
      },
    );

    // 為新 agent 註冊輸出緩衝區
    this.registerAgentOutputBuffer(agent.id);

    // 自動訂閱創建者
    this.handleSubscribe(agent.id, client);

    this.server.emit('agent:created', agent);
    return agent;
  }

  @SubscribeMessage('agent:command')
  handleCommand(
    @MessageBody() payload: { agentId: string; command: string },
  ): boolean {
    return this.agentService.executeCommand(payload.agentId, payload.command);
  }

  @SubscribeMessage('agent:input')
  handleInput(
    @MessageBody() payload: { agentId: string; data: string },
  ): boolean {
    return this.agentService.writeInput(payload.agentId, payload.data);
  }

  @SubscribeMessage('agent:resize')
  handleResize(
    @MessageBody() payload: { agentId: string; cols: number; rows: number },
  ): boolean {
    return this.agentService.resizeTerminal(
      payload.agentId,
      payload.cols,
      payload.rows,
    );
  }

  @SubscribeMessage('agent:remove')
  async handleRemoveAgent(@MessageBody() agentId: string): Promise<boolean> {
    // 取消註冊輸出緩衝區
    this.outputBufferService.unregisterAgent(agentId);

    // 清理該 agent 的所有訂閱
    const subscribers = this.agentSubscribers.get(agentId);
    if (subscribers) {
      for (const clientId of subscribers) {
        const clientSubs = this.clientSubscriptions.get(clientId);
        if (clientSubs) {
          clientSubs.delete(agentId);
        }
      }
      this.agentSubscribers.delete(agentId);
    }

    const result = await this.agentService.removeAgent(agentId);
    if (result) {
      this.server.emit('agent:removed', agentId);
    }
    return result;
  }

  @SubscribeMessage('agent:restart')
  handleRestartAgent(@MessageBody() agentId: string): boolean {
    const result = this.agentService.restartAgent(agentId);
    if (result) {
      const agent = this.agentService.getAgent(agentId);
      if (agent) {
        this.server.emit('agent:restarted', agent);
      }
    }
    return result;
  }

  @SubscribeMessage('agent:list')
  handleListAgents(): Agent[] {
    return this.agentService.getAllAgents();
  }

  @SubscribeMessage('fs:listDirs')
  handleListDirs(
    @MessageBody() payload: { dirPath: string; requestId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    try {
      const expandedPath = expandTilde(payload.dirPath);

      // Validate path is within allowed directories (home directory by default)
      if (!isPathAllowed(expandedPath)) {
        console.warn(`[AgentGateway] Path access denied: ${payload.dirPath}`);
        client.emit('fs:listDirs:response', { requestId: payload.requestId, dirs: [], error: 'Access denied' });
        return;
      }

      const entries = fs.readdirSync(expandedPath, { withFileTypes: true });
      const dirs = entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => ({
          name: entry.name,
          path: path.join(payload.dirPath, entry.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      client.emit('fs:listDirs:response', { requestId: payload.requestId, dirs });
    } catch (error) {
      console.error('Failed to list directories:', error);
      client.emit('fs:listDirs:response', { requestId: payload.requestId, dirs: [] });
    }
  }

  // === Agent 訂閱管理 ===

  @SubscribeMessage('agent:subscribe')
  handleSubscribe(
    @MessageBody() agentId: string,
    @ConnectedSocket() client: Socket,
  ): boolean {
    // 建立客戶端到 agent 的訂閱
    if (!this.clientSubscriptions.has(client.id)) {
      this.clientSubscriptions.set(client.id, new Set());
    }
    this.clientSubscriptions.get(client.id)!.add(agentId);

    // 建立 agent 到客戶端的反向索引
    if (!this.agentSubscribers.has(agentId)) {
      this.agentSubscribers.set(agentId, new Set());
    }
    this.agentSubscribers.get(agentId)!.add(client.id);

    console.log(`[AgentGateway] Client ${client.id.substring(0, 8)} subscribed to agent ${agentId.substring(0, 8)}`);
    return true;
  }

  @SubscribeMessage('agent:unsubscribe')
  handleUnsubscribe(
    @MessageBody() agentId: string,
    @ConnectedSocket() client: Socket,
  ): boolean {
    // 移除客戶端到 agent 的訂閱
    const clientSubs = this.clientSubscriptions.get(client.id);
    if (clientSubs) {
      clientSubs.delete(agentId);
      if (clientSubs.size === 0) {
        this.clientSubscriptions.delete(client.id);
      }
    }

    // 移除 agent 到客戶端的反向索引
    const agentSubs = this.agentSubscribers.get(agentId);
    if (agentSubs) {
      agentSubs.delete(client.id);
      if (agentSubs.size === 0) {
        this.agentSubscribers.delete(agentId);
      }
    }

    console.log(`[AgentGateway] Client ${client.id.substring(0, 8)} unsubscribed from agent ${agentId.substring(0, 8)}`);
    return true;
  }
}
