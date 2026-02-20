import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface SocketContextValue {
  socket: Socket;
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 等待 socket 建立完成
  if (!socket) {
    return null;
  }

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
