import { Server as SocketServer } from 'socket.io';
import { FastifyInstance } from 'fastify';

export function setupSocketIO(fastify: FastifyInstance) {
  const io = new SocketServer(fastify.server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    socket.on('join-project', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('disconnect', () => console.log(`Disconnected: ${socket.id}`));
  });

  return io;
}