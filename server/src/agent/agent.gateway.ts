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
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AgentService } from './agent.service';
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

  constructor(private readonly agentService: AgentService) {}

  // WorkflowService 會在初始化後注入自己
  setWorkflowService(workflowService: WorkflowService) {
    this.workflowService = workflowService;
  }

  async afterInit() {
    // Gateway 初始化後恢復 agents
    const restoredAgents = await this.agentService.restoreAgents(
      (agentId, data) => {
        const output: TerminalOutput = {
          agentId,
          data,
          timestamp: Date.now(),
        };
        this.server.emit('agent:output', output);
      },
      (updatedAgent) => {
        this.server.emit('agent:updated', updatedAgent);
      },
    );

    if (restoredAgents.length > 0) {
      console.log(`[AgentGateway] Restored ${restoredAgents.length} agents`);
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
        const output: TerminalOutput = {
          agentId,
          data,
          timestamp: Date.now(),
        };
        this.server.emit('agent:output', output);
      },
      (updatedAgent) => {
        this.server.emit('agent:updated', updatedAgent);
      },
    );

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

}
