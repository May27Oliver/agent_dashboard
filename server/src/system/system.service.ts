import { Injectable } from '@nestjs/common';
import * as os from 'os';

export interface SystemStats {
  cpu: number;
  memory: number;
  activePty: number;
  wsConnections: number;
  uptime: number;
}

export interface EventLog {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  source?: string;
}

@Injectable()
export class SystemService {
  private logs: EventLog[] = [];
  private readonly maxLogs = 100;
  private activePtyCount = 0;
  private wsConnectionCount = 0;
  private startTime = Date.now();

  getStats(): SystemStats {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce(
      (acc, cpu) =>
        acc +
        cpu.times.user +
        cpu.times.nice +
        cpu.times.sys +
        cpu.times.idle +
        cpu.times.irq,
      0,
    );
    const cpuUsage = Math.round(((totalTick - totalIdle) / totalTick) * 100);

    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const memoryUsage = Math.round(((totalMemory - freeMemory) / totalMemory) * 100);

    return {
      cpu: cpuUsage,
      memory: memoryUsage,
      activePty: this.activePtyCount,
      wsConnections: this.wsConnectionCount,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  addLog(
    level: EventLog['level'],
    message: string,
    source?: string,
  ): EventLog {
    const log: EventLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      message,
      source,
    };

    this.logs.unshift(log);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    return log;
  }

  getLogs(): EventLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  setActivePtyCount(count: number): void {
    this.activePtyCount = count;
  }

  incrementPtyCount(): void {
    this.activePtyCount++;
  }

  decrementPtyCount(): void {
    if (this.activePtyCount > 0) {
      this.activePtyCount--;
    }
  }

  setWsConnectionCount(count: number): void {
    this.wsConnectionCount = count;
  }

  incrementWsConnections(): void {
    this.wsConnectionCount++;
  }

  decrementWsConnections(): void {
    if (this.wsConnectionCount > 0) {
      this.wsConnectionCount--;
    }
  }
}
