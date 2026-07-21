import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AUTH_TOKEN_CHANGED_EVENT } from '../utils/authEvents';

const API_GATEWAY_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000';

// Global cache để dùng chung kết nối Socket, tránh mỗi component tạo 1 connection mới gây spam log backend
const globalSockets: Record<string, Socket> = {};
const globalSocketTokens: Record<string, string> = {};

export function useSocket(namespace: string = '') {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<any>(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('token') || '');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const syncToken = () => setAuthToken(localStorage.getItem('token') || '');
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token') syncToken();
    };

    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncToken);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', syncToken);

    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncToken);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', syncToken);
    };
  }, []);

  useEffect(() => {
    const token = authToken;

    if (!token) {
      if (globalSockets[namespace]) {
        globalSockets[namespace].disconnect();
        delete globalSockets[namespace];
        delete globalSocketTokens[namespace];
      }
      socketRef.current = null;
      setIsConnected(false);
      setConnectionError(null);
      return;
    }

    if (globalSockets[namespace] && globalSocketTokens[namespace] !== token) {
      globalSockets[namespace].disconnect();
      delete globalSockets[namespace];
      delete globalSocketTokens[namespace];
    }

    // Nếu chưa có kết nối cho namespace này thì mới tạo
    if (!globalSockets[namespace]) {
      globalSockets[namespace] = io(`${API_GATEWAY_URL}${namespace}`, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        auth: {
          token,
        },
      });
      globalSocketTokens[namespace] = token;
      // Tắt bớt log frontend để đỡ rác console
      // globalSockets[namespace].on('connect', () => console.log(`✅ Socket connected to ${namespace || 'root'}`));
      // globalSockets[namespace].on('disconnect', () => console.log(`❌ Socket disconnected from ${namespace || 'root'}`));
      globalSockets[namespace].on('connect_error', (error) => {
        // console.error('Socket connection error:', error.message);
      });
    }


    const socket = globalSockets[namespace];
    socketRef.current = socket;
    setIsConnected(socket.connected);

    const onConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };
    const onDisconnect = () => setIsConnected(false);
    const onConnectError = (err: any) => {
      setConnectionError(err);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Không gọi socket.disconnect() ở đây vì các component khác có thể đang dùng chung socket này
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, [namespace, authToken]);

  const onEvent = (event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const offEvent = (event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return { isConnected, socket: socketRef.current, onEvent, offEvent, connectionError };
}
