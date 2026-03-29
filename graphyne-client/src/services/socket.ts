import { io, Socket } from 'socket.io-client';

const SOCKET_URL = `http://${window.location.hostname}:3001`;

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'], // Force websocket to avoid polling delay
            reconnection: true,
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to Graphyne Engine:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from Graphyne Engine');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Send a command (e.g., from Playout Page)
    emit<T = unknown>(event: string, data?: T) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    // Listen for events (e.g., in Renderer)
    on<T = unknown>(event: string, callback: (data: T) => void) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    // Clean up listeners
    off(event: string) {
        if (this.socket) {
            this.socket.off(event);
        }
    }
}

// Export a single instance for the whole app
export const socketService = new SocketService();

// Helper to get the Better Auth session cookie
function getSessionToken() {
  const match = document.cookie.match(new RegExp('(^| )better-auth.session_token=([^;]+)'));
  if (match) return match[2];
  return null;
}

export const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
  auth: (cb) => {
    // Dynamically fetch the token every time the socket connects/reconnects
    cb({ token: getSessionToken() });
  },
  withCredentials: true // Ensures cookies are sent if needed
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
  // If unauthorized, you could trigger a window.location.reload() to force a login redirect
});