import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Singleton reference to ensure one connection across the app
let socketInstance: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  if (!socketInstance) {
    // Initialize only once
    socketInstance = io('/', {
      path: '/socket.io', // Matches the proxy config in vite.config.ts
      transports: ['websocket'], // Force WebSocket for performance
      autoConnect: true,
    });
  }

  socketRef.current = socketInstance;

  useEffect(() => {
    return () => {
      // Optional: Cleanup if you want to disconnect on unmount
      // socketInstance?.disconnect(); 
      // socketInstance = null;
    };
  }, []);

  return { socket: socketRef.current };
}