import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs-extra';
import { projectRoutes } from './routes/projects';
import { graphicRoutes } from './routes/graphics';
import { datasourceRoutes } from './routes/datasources';
import { DataPollerService } from './services/dataPoller';

// 1. Setup Directories
const DATA_DIR = path.join(__dirname, '../data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const GRAPHICS_DIR = path.join(DATA_DIR, 'graphics');

fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(GRAPHICS_DIR);

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

// B. Serve Compiled HTML Graphics
app.register(fastifyStatic, {
    root: GRAPHICS_DIR,
    prefix: '/graphics/',
    decorateReply: false // Required when registering static plugin twice
});

// 5. Initialize Socket.io
const io = new Server(app.server, {
    cors: {
        origin: "*", // Allow Vite client
        methods: ["GET", "POST"]
    }
});

// 6. Initialize the Data Poller Service (needs io instance)
const dataPoller = new DataPollerService(io);

// 4. Register Routes
app.register(projectRoutes);
app.register(graphicRoutes(DATA_DIR));
app.register(datasourceRoutes(dataPoller));

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined session ${sessionId}`);
    });

    // Relay "TAKE" commands to the Renderer
    // Now also forwards element data for binding resolution on the output page
    socket.on('command:take', (data) => {
        console.log('⚡ TAKING GRAPHIC:', data);
        socket.broadcast.emit('render:take', data);
    });

    socket.on('command:clear', () => {
        console.log('⚡ CLEARING PROGRAM');
        socket.broadcast.emit('render:clear');
    });

    // --- DATA SOURCE SOCKET COMMANDS ---
    // Client can request to start/stop polling via socket (alternative to REST)
    socket.on('data:start-polling', async (payload: { sourceId: string }) => {
        try {
            const { prisma } = await import('./lib/prisma');
            const source = await prisma.dataSource.findUnique({ where: { id: payload.sourceId } });
            if (source) {
                const config = JSON.parse(source.config);
                dataPoller.start({
                    id: source.id,
                    name: source.name,
                    type: source.type as 'rest-api' | 'json-file' | 'csv-file',
                    url: config.url,
                    filePath: config.filePath,
                    headers: config.headers,
                    rootPath: config.rootPath,
                    pollingInterval: source.pollingInterval,
                });
            }
        } catch (err) {
            console.error('Failed to start polling via socket:', err);
        }
    });

    socket.on('data:stop-polling', (payload: { sourceId: string }) => {
        dataPoller.stop(payload.sourceId);
    });

    // Manual fetch request (single poll)
    socket.on('data:fetch-once', async (payload: { sourceId: string }) => {
        try {
            const { prisma } = await import('./lib/prisma');
            const source = await prisma.dataSource.findUnique({ where: { id: payload.sourceId } });
            if (source) {
                const config = JSON.parse(source.config);
                const result = await dataPoller.fetchOnce({
                    id: source.id,
                    name: source.name,
                    type: source.type as 'rest-api' | 'json-file' | 'csv-file',
                    url: config.url,
                    filePath: config.filePath,
                    headers: config.headers,
                    rootPath: config.rootPath,
                    pollingInterval: 0,
                });
                io.emit('data:update', { sourceId: source.id, data: result.flat });
            }
        } catch (err) {
            console.error('Manual fetch failed:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// 7. Start Server
const start = async () => {
    try {
        await app.listen({ port: 3001, host: '0.0.0.0' });
        console.log(`🚀 Graphyne Backend running at http://localhost:3001`);
        console.log(`📂 Serving Graphics at /graphics/`);
        console.log(`📡 Data Poller Service ready`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();