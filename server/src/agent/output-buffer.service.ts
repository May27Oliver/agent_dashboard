import { Injectable, OnModuleDestroy } from '@nestjs/common';

interface BufferEntry {
  buffer: string;
  onFlush: (data: string) => void;
  timer: ReturnType<typeof setInterval>;
}

/**
 * 輸出緩衝服務
 * 累積終端輸出，每 50ms 或緩衝區滿 4KB 時批量發送
 * 這樣可以大幅減少 WebSocket 訊息數量，提升效能
 */
@Injectable()
export class OutputBufferService implements OnModuleDestroy {
  private readonly BATCH_INTERVAL_MS = 50;
  private readonly MAX_BUFFER_SIZE = 4096; // 4KB

  private buffers = new Map<string, BufferEntry>();
  // 暫存尚未註冊的 agent 輸出，待註冊後立即發送
  private pendingData = new Map<string, string[]>();

  /**
   * 為 agent 註冊緩衝區
   * @param agentId Agent ID
   * @param onFlush 當緩衝區 flush 時調用的回調
   */
  registerAgent(agentId: string, onFlush: (data: string) => void): void {
    // 如果已存在，先清理
    this.unregisterAgent(agentId);

    const entry: BufferEntry = {
      buffer: '',
      onFlush,
      timer: setInterval(() => this.flush(agentId), this.BATCH_INTERVAL_MS),
    };

    this.buffers.set(agentId, entry);

    // 處理之前暫存的數據（agent 恢復時可能在註冊前就有輸出）
    const pending = this.pendingData.get(agentId);
    if (pending && pending.length > 0) {
      const data = pending.join('');
      this.pendingData.delete(agentId);
      entry.buffer = data;
      this.flush(agentId);
    }
  }

  /**
   * 取消 agent 的緩衝區註冊
   * @param agentId Agent ID
   */
  unregisterAgent(agentId: string): void {
    const entry = this.buffers.get(agentId);
    if (entry) {
      clearInterval(entry.timer);
      // 確保剩餘數據被發送
      if (entry.buffer.length > 0) {
        entry.onFlush(entry.buffer);
      }
      this.buffers.delete(agentId);
    }
  }

  /**
   * 添加數據到緩衝區
   * @param agentId Agent ID
   * @param data 要緩衝的數據
   */
  append(agentId: string, data: string): void {
    const entry = this.buffers.get(agentId);
    if (!entry) {
      // 暫存到待處理佇列，待 registerAgent 時再發送
      // 這解決了 agent 恢復時輸出早於註冊的問題
      if (!this.pendingData.has(agentId)) {
        this.pendingData.set(agentId, []);
      }
      this.pendingData.get(agentId)!.push(data);
      return;
    }

    entry.buffer += data;

    // 如果緩衝區超過閾值，立即 flush
    if (entry.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush(agentId);
    }
  }

  /**
   * 強制 flush 指定 agent 的緩衝區
   * @param agentId Agent ID
   */
  flush(agentId: string): void {
    const entry = this.buffers.get(agentId);
    if (!entry || entry.buffer.length === 0) return;

    const data = entry.buffer;
    entry.buffer = '';
    entry.onFlush(data);
  }

  /**
   * 強制 flush 所有緩衝區
   */
  flushAll(): void {
    for (const agentId of this.buffers.keys()) {
      this.flush(agentId);
    }
  }

  /**
   * 模組銷毀時清理所有資源
   */
  onModuleDestroy(): void {
    for (const [agentId, entry] of this.buffers) {
      clearInterval(entry.timer);
      if (entry.buffer.length > 0) {
        entry.onFlush(entry.buffer);
      }
    }
    this.buffers.clear();
  }
}
