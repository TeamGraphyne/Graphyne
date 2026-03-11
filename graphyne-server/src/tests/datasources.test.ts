/**
 * Test Suite: Datasource Routes (src/routes/datasources.ts)
 *
 * Covers all 6 route handlers:
 *   GET  /api/projects/:projectId/datasources
 *   POST /api/projects/:projectId/datasources
 *   DELETE /api/datasources/:id
 *   POST /api/datasources/test
 *   POST /api/datasources/:id/start
 *   POST /api/datasources/:id/stop
 *
 * The DataPollerService dependency is replaced with a vi.fn() mock object.
 * Prisma is mocked via the shared __mocks__/prisma.ts file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { datasourceRoutes } from '../routes/datasources';

// ─── Module Mocks ─────────────────────────────────────────────────────────────
vi.mock('../lib/prisma', () => import('./__mocks__/prisma'));

import { prisma } from '../lib/prisma';

// ─── Poller Mock ──────────────────────────────────────────────────────────────
// A lightweight mock of DataPollerService — only the methods used by the routes.
function makeMockPoller() {
    return {
        start: vi.fn(),
        stop: vi.fn(),
        fetchOnce: vi.fn(),
        isRunning: vi.fn().mockReturnValue(false),
    };
}

// ─── App factory ──────────────────────────────────────────────────────────────
async function buildApp(poller = makeMockPoller()) {
    const app = Fastify({ logger: false });
    app.register(datasourceRoutes(poller as any));
    await app.ready();
    return { app, poller };
}

// ─── A valid saved datasource record (as Prisma would return it) ──────────────
const savedSource = {
    id: 'src-uuid-001',
    projectId: 'proj-001',
    name: 'Sports API',
    type: 'rest-api',
    config: JSON.stringify({ url: 'https://api.example.com/scores' }),
    pollingInterval: 5,
    autoStart: true,
    fields: JSON.stringify([{ path: 'score', type: 'number', sampleValue: '42' }]),
    createdAt: new Date(),
    updatedAt: new Date(),
};

beforeEach(() => {
    vi.clearAllMocks();
});

// ===========================================================================
// GET /api/projects/:projectId/datasources
// ===========================================================================
describe('GET /api/projects/:projectId/datasources', () => {

    it('DS-1 — lists datasources for a project with config and fields parsed from JSON', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.findMany).mockResolvedValue([savedSource] as any);

        const res = await app.inject({
            method: 'GET',
            url: '/api/projects/proj-001/datasources',
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(1);

        // config must be parsed from JSON string into an object
        expect(body[0].config).toEqual({ url: 'https://api.example.com/scores' });
        // fields must be parsed from JSON string into an array
        expect(Array.isArray(body[0].fields)).toBe(true);
        expect(body[0].fields[0].path).toBe('score');
    });

    it('DS-2 — returns empty array when a project has no datasources', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.findMany).mockResolvedValue([]);

        const res = await app.inject({
            method: 'GET',
            url: '/api/projects/proj-empty/datasources',
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([]);
    });

    it('DS-3 — returns empty array for fields when the fields column is null', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.findMany).mockResolvedValue([
            { ...savedSource, fields: null },
        ] as any);

        const res = await app.inject({
            method: 'GET',
            url: '/api/projects/proj-001/datasources',
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()[0].fields).toEqual([]);
    });
});

// ===========================================================================
// POST /api/projects/:projectId/datasources
// ===========================================================================
describe('POST /api/projects/:projectId/datasources', () => {

    const validBody = {
        name: 'Live Score API',
        type: 'rest-api',
        config: { url: 'https://api.example.com/live' },
        pollingInterval: 10,
        autoStart: false,
    };

    it('DS-4 — creates a new datasource and returns success with parsed config', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.upsert).mockResolvedValue(savedSource as any);

        const res = await app.inject({
            method: 'POST',
            url: '/api/projects/proj-001/datasources',
            payload: validBody,
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.id).toBe('src-uuid-001');
        // The source.config in the response must be parsed back to an object
        expect(body.source.config).toEqual({ url: 'https://api.example.com/scores' });
    });

    it('DS-5 — auto-generates a UUID when no id is provided', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.upsert).mockResolvedValue(savedSource as any);

        await app.inject({
            method: 'POST',
            url: '/api/projects/proj-001/datasources',
            payload: validBody,
        });

        // Explicitly assert the call was made before drilling into it
        const calls = vi.mocked(prisma.dataSource.upsert).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const upsertCall = calls[0][0];

        // where.id should be a truthy auto-generated UUID string
        expect(typeof upsertCall.where.id).toBe('string');
        expect((upsertCall.where.id as string).length).toBeGreaterThan(0);
    });

    it('DS-6 — uses the provided id when updating an existing datasource', async () => {
        const { app } = await buildApp();
        const existingId = 'existing-src-uuid';
        vi.mocked(prisma.dataSource.upsert).mockResolvedValue({
            ...savedSource,
            id: existingId,
        } as any);

        await app.inject({
            method: 'POST',
            url: '/api/projects/proj-001/datasources',
            payload: { ...validBody, id: existingId },
        });

        // Explicitly assert the call was made before drilling into it
        const calls = vi.mocked(prisma.dataSource.upsert).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const upsertCall = calls[0][0];

        expect(upsertCall.where.id).toBe(existingId);
    });

    it('DS-7 — serialises config and fields as JSON strings in the DB upsert', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.upsert).mockResolvedValue(savedSource as any);

        await app.inject({
            method: 'POST',
            url: '/api/projects/proj-001/datasources',
            payload: { ...validBody, fields: [{ path: 'score', type: 'number' }] },
        });

        const upsertCall = vi.mocked(prisma.dataSource.upsert).mock.calls[0][0];
        // config must be a JSON string in the DB call, not a raw object
        expect(typeof upsertCall.create.config).toBe('string');
        expect(JSON.parse(upsertCall.create.config as string)).toEqual(validBody.config);
        // fields must also be a JSON string
        expect(typeof upsertCall.create.fields).toBe('string');
    });

    it('DS-8 — returns 500 when the database upsert throws', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.upsert).mockRejectedValue(new Error('DB error'));

        const res = await app.inject({
            method: 'POST',
            url: '/api/projects/proj-001/datasources',
            payload: validBody,
        });

        expect(res.statusCode).toBe(500);
        expect(res.json()).toEqual({ error: 'Failed to save data source' });
    });
});

// ===========================================================================
// DELETE /api/datasources/:id
// ===========================================================================
describe('DELETE /api/datasources/:id', () => {

    it('DS-9 — deletes a datasource and returns success', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.delete).mockResolvedValue(savedSource as any);

        const res = await app.inject({
            method: 'DELETE',
            url: '/api/datasources/src-uuid-001',
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ success: true });
        expect(prisma.dataSource.delete).toHaveBeenCalledWith({
            where: { id: 'src-uuid-001' },
        });
    });

    it('DS-10 — calls poller.stop() before deleting to prevent orphaned intervals', async () => {
        const { app, poller } = await buildApp();
        vi.mocked(prisma.dataSource.delete).mockResolvedValue(savedSource as any);

        await app.inject({
            method: 'DELETE',
            url: '/api/datasources/src-uuid-001',
        });

        // poller.stop must be called with the correct sourceId BEFORE delete
        expect(poller.stop).toHaveBeenCalledWith('src-uuid-001');
        expect(poller.stop).toHaveBeenCalledBefore(vi.mocked(prisma.dataSource.delete) as any);
    });

    it('DS-11 — returns 500 when the database delete throws', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.delete).mockRejectedValue(new Error('FK constraint'));

        const res = await app.inject({
            method: 'DELETE',
            url: '/api/datasources/src-uuid-001',
        });

        expect(res.statusCode).toBe(500);
        expect(res.json()).toEqual({ error: 'Failed to delete data source' });
    });
});

// ===========================================================================
// POST /api/datasources/test
// ===========================================================================
describe('POST /api/datasources/test', () => {

    it('DS-12 — returns fields and sampleData when fetchOnce succeeds', async () => {
        const { app, poller } = await buildApp();
        poller.fetchOnce.mockResolvedValue({
            flat: { score: 42, team: 'Graphyne FC' },
            fields: [
                { path: 'score', type: 'number', sampleValue: '42' },
                { path: 'team', type: 'string', sampleValue: 'Graphyne FC' },
            ],
        });

        const res = await app.inject({
            method: 'POST',
            url: '/api/datasources/test',
            payload: {
                type: 'rest-api',
                config: { url: 'https://api.example.com/scores' },
            },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.fields).toHaveLength(2);
        expect(body.sampleData.score).toBe(42);
    });

    it('DS-13 — returns 400 when fetchOnce throws (bad URL, file not found, etc.)', async () => {
        const { app, poller } = await buildApp();
        poller.fetchOnce.mockRejectedValue(new Error('HTTP 404: Not Found'));

        const res = await app.inject({
            method: 'POST',
            url: '/api/datasources/test',
            payload: {
                type: 'rest-api',
                config: { url: 'https://api.example.com/nope' },
            },
        });

        expect(res.statusCode).toBe(400);
        expect(res.json().error).toContain('HTTP 404');
    });
});

// ===========================================================================
// POST /api/datasources/:id/start
// ===========================================================================
describe('POST /api/datasources/:id/start', () => {

    it('DS-14 — starts polling a found datasource and returns success', async () => {
        const { app, poller } = await buildApp();
        vi.mocked(prisma.dataSource.findUnique).mockResolvedValue(savedSource as any);

        const res = await app.inject({
            method: 'POST',
            url: '/api/datasources/src-uuid-001/start',
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
        expect(poller.start).toHaveBeenCalledOnce();

        // Confirm the poller receives the correct config from the DB record
        const startArg = poller.start.mock.calls[0][0];
        expect(startArg.id).toBe('src-uuid-001');
        expect(startArg.type).toBe('rest-api');
        expect(startArg.url).toBe('https://api.example.com/scores');
    });

    it('DS-15 — returns 404 when the datasource does not exist', async () => {
        const { app, poller } = await buildApp();
        vi.mocked(prisma.dataSource.findUnique).mockResolvedValue(null);

        const res = await app.inject({
            method: 'POST',
            url: '/api/datasources/nonexistent/start',
        });

        expect(res.statusCode).toBe(404);
        expect(res.json()).toEqual({ error: 'Source not found' });
        expect(poller.start).not.toHaveBeenCalled();
    });

    it('DS-16 — returns 500 when the database lookup throws', async () => {
        const { app } = await buildApp();
        vi.mocked(prisma.dataSource.findUnique).mockRejectedValue(new Error('DB down'));

        const res = await app.inject({
            method: 'POST',
            url: '/api/datasources/src-uuid-001/start',
        });

        expect(res.statusCode).toBe(500);
        expect(res.json()).toEqual({ error: 'Failed to start polling' });
    });
});

// ===========================================================================
// POST /api/datasources/:id/stop
// ===========================================================================
describe('POST /api/datasources/:id/stop', () => {

    it('DS-17 — stops a polling source and returns success', async () => {
        const { app, poller } = await buildApp();

        const res = await app.inject({
            method: 'POST',
            url: '/api/datasources/src-uuid-001/stop',
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ success: true });
        expect(poller.stop).toHaveBeenCalledWith('src-uuid-001');
    });

    it('DS-18 — calling stop on a non-running source does not throw (idempotent)', async () => {
        const { app, poller } = await buildApp();
        // stop() on a non-running source is a no-op in the real service
        poller.stop.mockImplementation(() => { /* no-op */ });

        const res = await app.inject({
            method: 'POST',
            url: '/api/datasources/src-uuid-nope/stop',
        });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ success: true });
    });
});