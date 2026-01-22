import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs-extra';
import { projectRoutes } from './routes/projects';

// 1. Setup Directories
const DATA_DIR = path.join(__dirname, '../data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(PROJECTS_DIR);

// 2. Initialize Fastify
const app = Fastify({ logger: true });

// 3. Register Plugins
app.register(cors, { origin: '*' }); // Allow Client to connect
app.register(multipart); // Support file uploads
// Serve uploaded images statically at http://localhost:3001/uploads/filename.png
app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
});

// 4. Register Routes
app.register(projectRoutes(PROJECTS_DIR));

// 5. Initialize Socket.io
const io = new Server(app.server, {
    cors: {
        origin: "*", // Allow Vite client
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Example: Client joins a specific "session" room
    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined session ${sessionId}`);
    });

    // Example: Receive "TAKE" command from Playout, forward to Renderer
    socket.on('command:take', (data) => {
        // Broadcast to everyone EXCEPT sender (or specifically to renderer)
        socket.broadcast.emit('render:take', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// 6. Start Server
const start = async () => {
    try {
        await app.listen({ port: 3001, host: '0.0.0.0' });
        console.log(`🚀 Graphyne Backend running at http://localhost:3001`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();