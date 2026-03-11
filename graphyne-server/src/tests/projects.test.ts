/**
 * Test Suite 2: Project Routes (src/routes/projects.ts)
 *
 * All 10 test cases cover CRUD, transaction integrity,
 * playlist ordering, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { projectRoutes } from '../routes/projects';

// ─── Module Mocks ─────────────────────────────────────────────────────────────
vi.mock('../lib/prisma', () => import('./__mocks__/prisma'));

import { prisma } from '../lib/prisma';

// ─── Helper ───────────────────────────────────────────────────────────────────
async function buildApp() {
    const app = Fastify({ logger: false });
    app.register(projectRoutes);
    await app.ready();
    return app;
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ===========================================================================
// SUITE 2: GET /api/projects
// ===========================================================================
describe('GET /api/projects', () => {

    // ── Test 2.1 ─────────────────────────────────────────────────────────────
    it('2.1 — lists all projects ordered by updatedAt descending with item count', async () => {
        const app = await buildApp();
        const mockProjects = [
            { id: 'p1', name: 'Morning Show', updatedAt: new Date('2026-03-10'), _count: { items: 3 } },
            { id: 'p2', name: 'Evening News', updatedAt: new Date('2026-03-09'), _count: { items: 1 } },
        ];
        vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as any);

        const res = await app.inject({ method: 'GET', url: '/api/projects' });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveLength(2);
        expect(body[0].id).toBe('p1');
        expect(body[0]._count.items).toBe(3);

        // FIX: Cast the query arg to `any` to avoid TypeScript narrowing the
        // `_count` field to a union of `boolean | ProjectCountOutputTypeDefaultArgs`.
        // We only care about the runtime shape, not the static type here.
        const queryCall = vi.mocked(prisma.project.findMany).mock.calls[0][0] as any;
        expect(queryCall?.orderBy).toEqual({ updatedAt: 'desc' });
        expect(queryCall?.include?._count?.select?.items).toBe(true);
    });

    // ── Test 2.2 ─────────────────────────────────────────────────────────────
    it('2.2 — returns empty array when no projects exist', async () => {
        const app = await buildApp();
        vi.mocked(prisma.project.findMany).mockResolvedValue([]);

        const res = await app.inject({ method: 'GET', url: '/api/projects' });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([]);
    });
});

// ===========================================================================
// SUITE 2: GET /api/projects/:id
// ===========================================================================
describe('GET /api/projects/:id', () => {

    // ── Test 2.3 ─────────────────────────────────────────────────────────────
    it('2.3 — loads a project with its playlist items and embedded graphic data', async () => {
        const app = await buildApp();
        const mockProject = {
            id: 'p1',
            name: 'Morning Show',
            updatedAt: new Date(),
            items: [
                {
                    id: 'item-1',
                    order: 0,
                    graphic: {
                        id: 'g1',
                        name: 'Lower Third',
                        filePath: '/graphics/g1.html',
                    },
                },
            ],
        };
        vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as any);

        const res = await app.inject({ method: 'GET', url: '/api/projects/p1' });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.id).toBe('p1');
        expect(body.items).toHaveLength(1);
        // filePath is critical for playout — must be present in the response
        expect(body.items[0].graphic.filePath).toBe('/graphics/g1.html');
    });

    // ── Test 2.4 ─────────────────────────────────────────────────────────────
    it('2.4 — returns null body when the project does not exist', async () => {
        const app = await buildApp();
        vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: '/api/projects/nonexistent' });

        // Fastify serialises null as a 200 with null body — the client handles null
        expect(res.statusCode).toBe(200);
        expect(res.json()).toBeNull();
    });
});

// ===========================================================================
// SUITE 2: POST /api/projects
// ===========================================================================
describe('POST /api/projects', () => {

    /**
     * Builds a transaction mock that exposes its own `tx` spy functions
     * so individual tests can inspect calls to tx.playlistItem.create, etc.
     *
     * NOTE: The source uses Promise.all + individual tx.playlistItem.create calls,
     * NOT createMany. All mocks here reflect that.
     */
    function mockTransaction(projectResult: any, createShouldFail = false) {
        const txCreate = createShouldFail
            ? vi.fn().mockRejectedValue(new Error('Foreign key constraint failed'))
            : vi.fn().mockResolvedValue({} as any);

        const txDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
        const txUpsert    = vi.fn().mockResolvedValue(projectResult);

        vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
            const tx = {
                project:      { upsert: txUpsert },
                playlistItem: { deleteMany: txDeleteMany, create: txCreate },
            };
            return callback(tx);
        });

        return { txCreate, txDeleteMany, txUpsert };
    }

    // ── Test 2.5 ─────────────────────────────────────────────────────────────
    it('2.5 — creates a new project and returns success with the generated id', async () => {
        const app = await buildApp();
        mockTransaction({ id: 'new-proj-uuid', name: 'Sports Night' });

        const res = await app.inject({
            method: 'POST',
            url: '/api/projects',
            payload: { name: 'Sports Night', items: [] },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.id).toBe('new-proj-uuid');
    });

    // ── Test 2.6 ─────────────────────────────────────────────────────────────
    it('2.6 — updates an existing project when an id is provided', async () => {
        const app = await buildApp();
        const { txUpsert } = mockTransaction({ id: 'existing-proj', name: 'Updated Rundown' });

        const res = await app.inject({
            method: 'POST',
            url: '/api/projects',
            payload: {
                id: 'existing-proj',
                name: 'Updated Rundown',
                items: [{ graphicId: 'g1', order: 0 }],
            },
        });

        expect(res.statusCode).toBe(200);
        expect(res.json().id).toBe('existing-proj');

        // The upsert inside the transaction must use the provided id
        expect(txUpsert).toHaveBeenCalledOnce();
        expect(txUpsert.mock.calls[0][0].where.id).toBe('existing-proj');
    });

    // ── Test 2.7 ─────────────────────────────────────────────────────────────
    it('2.7 — saves items with order based on array index, not the client-provided order value', async () => {
        const app = await buildApp();
        const { txCreate } = mockTransaction({ id: 'proj-order-test', name: 'Order Test' });

        // Client sends items with arbitrary order values (e.g. after drag-and-drop)
        const res = await app.inject({
            method: 'POST',
            url: '/api/projects',
            payload: {
                name: 'Order Test',
                items: [
                    { graphicId: 'g-first',  order: 99 }, // Client sends 99
                    { graphicId: 'g-second', order: 50 }, // Client sends 50
                ],
            },
        });

        expect(res.statusCode).toBe(200);

        // Source uses Promise.all over items.map → one create call per item
        expect(txCreate).toHaveBeenCalledTimes(2);

        // Server must overwrite client order values with the array index
        const firstCall  = txCreate.mock.calls[0][0].data;
        const secondCall = txCreate.mock.calls[1][0].data;

        expect(firstCall.graphicId).toBe('g-first');
        expect(firstCall.order).toBe(0);   // index 0

        expect(secondCall.graphicId).toBe('g-second');
        expect(secondCall.order).toBe(1);  // index 1
    });

    // ── Test 2.8 ─────────────────────────────────────────────────────────────
    it('2.8 — handles an empty items array without calling playlistItem.create', async () => {
        const app = await buildApp();
        const { txCreate } = mockTransaction({ id: 'empty-proj', name: 'Empty Project' });

        const res = await app.inject({
            method: 'POST',
            url: '/api/projects',
            payload: { name: 'Empty Project', items: [] },
        });

        expect(res.statusCode).toBe(200);
        // The `if (items && items.length > 0)` guard must prevent any creates
        expect(txCreate).not.toHaveBeenCalled();
    });

    // ── Test 2.9 ─────────────────────────────────────────────────────────────
    it('2.9 — returns 500 when playlistItem.create fails inside the transaction', async () => {
        const app = await buildApp();
        // createShouldFail = true → txCreate rejects → transaction propagates error
        mockTransaction({ id: 'rollback-proj', name: 'Rollback Test' }, true);

        const res = await app.inject({
            method: 'POST',
            url: '/api/projects',
            payload: {
                name: 'Rollback Test',
                items: [{ graphicId: 'nonexistent-graphic', order: 0 }],
            },
        });

        expect(res.statusCode).toBe(500);
        expect(res.json()).toEqual({ error: 'Failed to save project' });
    });

    // ── Test 2.10 ────────────────────────────────────────────────────────────
    it('2.10 — returns 500 with error message when the entire transaction throws', async () => {
        const app = await buildApp();
        vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Unexpected DB error'));

        const res = await app.inject({
            method: 'POST',
            url: '/api/projects',
            payload: { name: 'Bad Project', items: [] },
        });

        expect(res.statusCode).toBe(500);
        expect(res.json()).toEqual({ error: 'Failed to save project' });
    });
});