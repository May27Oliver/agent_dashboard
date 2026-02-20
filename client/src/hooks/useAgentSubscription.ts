import { useEffect } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';

/**
 * 訂閱特定 agent 的輸出
 * 當組件掛載時自動訂閱，卸載時自動取消訂閱
 * 這樣可以確保只接收當前顯示的終端輸出，減少不必要的網路傳輸
 *
 * @param agentId 要訂閱的 agent ID，null 表示不訂閱任何 agent
 */
export function useAgentSubscription(agentId: string | null) {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!agentId) return;

    // 訂閱 agent 輸出
    socket.emit('agent:subscribe', agentId);

    // 卸載時取消訂閱
    return () => {
      socket.emit('agent:unsubscribe', agentId);
    };
  }, [socket, agentId]);
}
