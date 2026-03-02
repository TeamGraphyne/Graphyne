import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

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