import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function useSocket(namespace: string = '') {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  useEffect(() => {
    // Prevent multiple socket instances
    if (socketRef.current?.connected) {
      console.log('⚠️  Socket already connected, reusing instance');
      return;
    }

    // Get JWT token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ No JWT token found, cannot connect WebSocket');
      setConnectionError('No authentication token');
      return;
    }
    
    console.log('🔌 Initializing WebSocket connection...');
    
    // Kết nối đến API Gateway với JWT auth
    const socket = io(`${API_GATEWAY_URL}${namespace}`, {
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      timeout: 10000,
      auth: {
        token: token, // Send token in handshake
      },
    });

    socket.on('connect', () => {
      console.log(`✅ Socket connected to ${API_GATEWAY_URL}${namespace || ''}`);
      console.log(`🆔 Socket ID: ${socket.id}`);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${reason}`);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected (token invalid, manual disconnect)
        console.warn('⚠️  Server disconnected the socket. Token may be invalid.');
        setConnectionError('Disconnected by server');
      }
    });

    socket.on('connect_error', (error) => {
      reconnectAttempts.current++;
      console.error(`❌ Socket connection error (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS}):`, error.message);
      setConnectionError(error.message);
      
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ Max reconnection attempts reached. Giving up.');
        socket.disconnect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      setConnectionError(null);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Attempting to reconnect... (${attemptNumber}/${MAX_RECONNECT_ATTEMPTS})`);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after max attempts');
      setConnectionError('Reconnection failed');
    });

    socketRef.current = socket;

    return () => {
      console.log('🧹 Cleaning up socket connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect');
      socket.off('reconnect_attempt');
      socket.off('reconnect_failed');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [namespace]); // Only re-run if namespace changes

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

  return { 
    isConnected, 
    connectionError,
    socket: socketRef.current, 
    onEvent, 
    offEvent 
  };
}
