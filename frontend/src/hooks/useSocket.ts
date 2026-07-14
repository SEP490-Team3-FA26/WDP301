import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function useSocket(namespace: string = '') {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Get JWT token from localStorage
    const token = localStorage.getItem('token');
    
    // Kết nối đến API Gateway với JWT auth
    const socket = io(`${API_GATEWAY_URL}${namespace}`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      auth: {
        token: token || '', // Send token in handshake
      },
    });

    socket.on('connect', () => {
      console.log(`✅ Socket connected to ${namespace || 'root'}`);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected from ${namespace || 'root'}`);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [namespace]);

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

  return { isConnected, socket: socketRef.current, onEvent, offEvent };
}
