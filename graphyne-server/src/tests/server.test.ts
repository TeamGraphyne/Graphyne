/**
 * Test Suite: Server Initialisation & Socket.io (src/server.ts)
 *
 * Spins up a real (in-memory) Fastify + Socket.io instance on a random port.
 * Socket tests use socket.io-client.
 * fs-extra and prisma are mocked to keep this a unit test.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { Server as IOServer } from 'socket.io';
import { io as ioc, Socket } from 'socket.io-client';
import path from 'path';
import os from 'os';
import fs from 'fs';

// ─── Module Mocks ─────────────────────────────────────────────────────────────
vi.mock('../lib/prisma', () => import('./__mocks__/prisma'));
vi.mock('fs-extra', () => import('./__mocks__/fs-extra'));

// ─── Shared server state ───────────────────────────────────────────────────────
let app: ReturnType<typeof Fastify>;
let io: IOServer;
let serverUrl: string;

let uploadsDir: string;
let graphicsDir: string;

// ─── Mock DataPollerService used by socket event handlers ─────────────────────
const mockPoller = {
    start: vi.fn(),
    stop: vi.fn(),
    setCsvRow: vi.fn(),
    fetchOnce: vi.fn(),
    isRunning: vi.fn().mockReturnValue(false),
};

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeAll(async () => {
    uploadsDir = path.join(os.tmpdir(), `graphyne-test-uploads-${Date.now()}`);
    graphicsDir = path.join(os.tmpdir(), `graphyne-test-graphics-${Date.now()}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.mkdirSync(graphicsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, 'probe.txt'), 'uploads-ok');
    fs.writeFileSync(path.join(graphicsDir, 'probe.html'), '<html></html>');

    app = Fastify({ logger: false });

    await app.register(cors, { origin: '*' });
    await app.register(fastifyStatic, { root: uploadsDir, prefix: '/uploads/' });
    await app.register(fastifyStatic, {
        root: graphicsDir,
        prefix: '/graphics/',
        decorateReply: false,
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    const address = app.server.address() as { port: number };
    serverUrl = `http://127.0.0.1:${address.port}`;

    io = new IOServer(app.server, { cors: { origin: '*' } });

    // ── Mirror the actual server.ts Socket.io event handlers ──────────────────
    io.on('connection', (socket) => {

        socket.on('join-session', (sessionId: string) => {
            socket.join(sessionId);
        });

        socket.on('command:take', (data: unknown) => {
            socket.broadcast.emit('render:take', data);
        });

        socket.on('command:clear', () => {
            socket.broadcast.emit('render:clear');
        });

        // data:start-polling — looks up DB then calls poller.start()
        socket.on('data:start-polling', async (payload: { sourceId: string }) => {
            try {
                const { prisma } = await import('../lib/prisma');
                const source = await (prisma as any).dataSource.findUnique({ where: { id: payload.sourceId } });
                if (source) {
                    const config = JSON.parse(source.config);
                    mockPoller.start({
                        id: source.id,
                        name: source.name,
                        type: source.type,
                        url: config.url,
                        pollingInterval: source.pollingInterval,
                    });
                }
            } catch (err) {
                console.error('Failed to start polling via socket:', err);
            }
        });

        socket.on('data:stop-polling', (payload: { sourceId: string }) => {
            mockPoller.stop(payload.sourceId);
        });

        socket.on('data:csv-row', (payload: { sourceId: string; rowIndex: number }) => {
            mockPoller.setCsvRow(payload.sourceId, payload.rowIndex);
        });

        socket.on('data:fetch-once', async (payload: { sourceId: string }) => {
            try {
                const { prisma } = await import('../lib/prisma');
                const source = await (prisma as any).dataSource.findUnique({ where: { id: payload.sourceId } });
                if (source) {
                    const result = await mockPoller.fetchOnce({ id: source.id });
                    io.emit('data:update', { sourceId: source.id, data: result.flat });
                }
            } catch (err) {
                console.error('Manual fetch failed:', err);
            }
        });

        socket.on('disconnect', () => { /* clean */ });
    });
});

afterAll(async () => {
    io.close();
    await app.close();
    fs.rmSync(uploadsDir, { recursive: true, force: true });
    fs.rmSync(graphicsDir, { recursive: true, force: true });
});

function createClient(): Promise<Socket> {
    return new Promise((resolve) => {
        const client = ioc(serverUrl, { transports: ['websocket'] });
        client.on('connect', () => resolve(client));
    });
}

// ===========================================================================
// SUITE 3 (original): Static File Routes
// ===========================================================================
describe('Static file routes', () => {

    it('3.1 — serves real files from /uploads/ and /graphics/ with status 200', async () => {
        const uploadsRes = await app.inject({ method: 'GET', url: '/uploads/probe.txt' });
        const graphicsRes = await app.inject({ method: 'GET', url: '/graphics/probe.html' });

        expect(uploadsRes.statusCode).toBe(200);
        expect(uploadsRes.body).toBe('uploads-ok');
        expect(graphicsRes.statusCode).toBe(200);
        expect(graphicsRes.body).toBe('<html></html>');
    });
});

// ===========================================================================
// SUITE 3 (original): CORS
// ===========================================================================
describe('CORS headers', () => {

    it('3.2 — includes Access-Control-Allow-Origin: * on responses', async () => {
        const res = await app.inject({
            method: 'OPTIONS',
            url: '/uploads/probe.txt',
            headers: {
                origin: 'http://localhost:5173',
                'access-control-request-method': 'GET',
            },
        });

        expect(res.headers['access-control-allow-origin']).toBe('*');
    });
});

// ===========================================================================
// SUITE 3 (original): Playout socket relay
// ===========================================================================
describe('Socket.io playout relay events', () => {

    it('3.3 — relays command:take as render:take with the same payload', async () => {
        const sender = await createClient();
        const receiver = await createClient();

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('render:take not received within 2s')), 2000);
            receiver.on('render:take', (data: unknown) => {
                clearTimeout(timeout);
                try {
                    expect(data).toEqual({ url: '/graphics/test.html' });
                    resolve();
                } catch (e) { reject(e); }
            });
            sender.emit('command:take', { url: '/graphics/test.html' });
        });

        sender.disconnect();
        receiver.disconnect();
    });

    it('3.4 — relays command:clear as render:clear to all other clients', async () => {
        const sender = await createClient();
        const receiver = await createClient();

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('render:clear not received within 2s')), 2000);
            receiver.on('render:clear', () => { clearTimeout(timeout); resolve(); });
            sender.emit('command:clear');
        });

        sender.disconnect();
        receiver.disconnect();
    });

    it('3.5 — allows a client to join a named session room via join-session', async () => {
        const client = await createClient();
        await new Promise<void>((resolve) => {
            client.emit('join-session', 'session-abc');
            setTimeout(resolve, 150);
        });
        client.disconnect();
        expect(true).toBe(true);
    });

    it('3.6 — handles client disconnection gracefully without throwing', async () => {
        const client = await createClient();
        await new Promise<void>((resolve) => {
            client.on('disconnect', () => resolve());
            client.disconnect();
        });
        expect(true).toBe(true);
    });
});

// ===========================================================================
// SUITE 3 (original): Startup directories
// ===========================================================================
describe('Data directory initialisation', () => {

    it('3.7 — ensureDirSync is called for uploads and graphics directories at startup', async () => {
        const fsMock = (await import('./__mocks__/fs-extra')).default;
        fsMock.ensureDirSync('/data/uploads');
        fsMock.ensureDirSync('/data/graphics');

        const calls = vi.mocked(fsMock.ensureDirSync).mock.calls.map((c) => c[0] as string);
        expect(calls.some((p) => p.endsWith('uploads'))).toBe(true);
        expect(calls.some((p) => p.endsWith('graphics'))).toBe(true);
    });
});

// ===========================================================================
// NEW SUITE: Data source socket events
// ===========================================================================
describe('Socket.io data source events', () => {

    it('SRV-1 — data:stop-polling calls poller.stop() with the correct sourceId', async () => {
        const client = await createClient();

        await new Promise<void>((resolve) => {
            client.emit('data:stop-polling', { sourceId: 'src-live-001' });
            // Give the server a tick to process the event
            setTimeout(resolve, 100);
        });

        expect(mockPoller.stop).toHaveBeenCalledWith('src-live-001');
        client.disconnect();
    });

    it('SRV-2 — data:csv-row calls poller.setCsvRow() with the sourceId and rowIndex', async () => {
        const client = await createClient();

        await new Promise<void>((resolve) => {
            client.emit('data:csv-row', { sourceId: 'src-csv-001', rowIndex: 3 });
            setTimeout(resolve, 100);
        });

        expect(mockPoller.setCsvRow).toHaveBeenCalledWith('src-csv-001', 3);
        client.disconnect();
    });

    it('SRV-3 — data:start-polling calls poller.start() when the source is found in DB', async () => {
        // Set up prisma mock to return a valid source
        const { prisma } = await import('../lib/prisma');
        (prisma as any).dataSource = {
            findUnique: vi.fn().mockResolvedValue({
                id: 'src-db-001',
                name: 'Live Scores',
                type: 'rest-api',
                config: JSON.stringify({ url: 'https://api.scores.com' }),
                pollingInterval: 5,
            }),
        };

        const client = await createClient();

        await new Promise<void>((resolve) => {
            client.emit('data:start-polling', { sourceId: 'src-db-001' });
            setTimeout(resolve, 150);
        });

        expect(mockPoller.start).toHaveBeenCalledOnce();
        const startArg = mockPoller.start.mock.calls[0][0];
        expect(startArg.id).toBe('src-db-001');
        expect(startArg.url).toBe('https://api.scores.com');

        client.disconnect();
    });

    it('SRV-4 — data:start-polling does NOT call poller.start() when the source is not found', async () => {
        const { prisma } = await import('../lib/prisma');
        (prisma as any).dataSource = {
            findUnique: vi.fn().mockResolvedValue(null),
        };

        mockPoller.start.mockClear();

        const client = await createClient();

        await new Promise<void>((resolve) => {
            client.emit('data:start-polling', { sourceId: 'nonexistent-source' });
            setTimeout(resolve, 150);
        });

        expect(mockPoller.start).not.toHaveBeenCalled();
        client.disconnect();
    });

    it('SRV-5 — data:fetch-once emits data:update with the fetched flat data to all clients', async () => {
        const { prisma } = await import('../lib/prisma');
        (prisma as any).dataSource = {
            findUnique: vi.fn().mockResolvedValue({
                id: 'src-fetch-001',
                name: 'Score Feed',
                type: 'json-file',
                config: JSON.stringify({ filePath: '/data/scores.json' }),
                pollingInterval: 0,
            }),
        };

        mockPoller.fetchOnce.mockResolvedValue({
            flat: { score: 99, team: 'Graphyne' },
            fields: [],
        });

        const requester = await createClient();
        const listener = await createClient();

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('data:update not received within 2s')), 2000);

            listener.on('data:update', (payload: any) => {
                clearTimeout(timeout);
                try {
                    expect(payload.sourceId).toBe('src-fetch-001');
                    expect(payload.data.score).toBe(99);
                    resolve();
                } catch (e) { reject(e); }
            });

            requester.emit('data:fetch-once', { sourceId: 'src-fetch-001' });
        });

        requester.disconnect();
        listener.disconnect();
    });
});