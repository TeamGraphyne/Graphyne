import { io, Socket } from 'socket.io-client';

const SOCKET_URL = `http://${window.location.hostname}:3002`;

class SocketService {
    private socket: Socket | null = null;
    private refCount = 0;

    connect() {
        this.refCount++;
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
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
        this.refCount = Math.max(0, this.refCount - 1);
        // Only truly disconnect when the last consumer unmounts
        if (this.refCount === 0 && this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    emit<T = unknown>(event: string, data?: T) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    // Accept the specific callback so we can remove only that listener,
    // not every listener registered for the event.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on<T = unknown>(event: string, callback: (data: T) => void) {
        if (this.socket) {
            this.socket.on(event, callback as any);
        }
    }

    // Pass the callback to remove only that specific listener.
    // Falls back to removing all listeners if no callback is given.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    off(event: string, callback?: (data: any) => void) {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback);
            } else {
                this.socket.off(event);
            }
        }
    }
}

// Export a single instance for the whole app
export const socketService = new SocketService();