import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function useSocket(namespace: string = '') {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Kết nối đến API Gateway
    const socket = io(`${API_GATEWAY_URL}${namespace}`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log(`Socket connected to ${namespace}`);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected from ${namespace}`);
      setIsConnected(false);
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
