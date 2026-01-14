import { Server as SocketServer } from 'socket.io';
import { FastifyInstance } from 'fastify';

export function setupSocketIO(fastify: FastifyInstance) {
  const io = new SocketServer(fastify.server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // 1. Join a Project Room
    socket.on('join-project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      console.log(`Socket ${socket.id} joined project:${projectId}`);
    });

    // 2. Handle Sync Events (The missing piece!)
    socket.on('canvas-update', (data) => {
      // data should look like: { projectId: '...', layers: [...] }
      
      // Broadcast to everyone else in the room (The Viewers)
      socket.to(`project:${data.projectId}`).emit('update-layers', data.layers);
    });

    socket.on('disconnect', () => console.log(`Disconnected: ${socket.id}`));
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