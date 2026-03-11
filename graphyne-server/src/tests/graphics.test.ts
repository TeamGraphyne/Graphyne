/**
 * Test Suite 1: Graphics Routes (src/routes/graphics.ts)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { graphicRoutes } from '../routes/graphics';

// ─── Module Mocks ─────────────────────────────────────────────────────────────
vi.mock('../lib/prisma', () => import('./__mocks__/prisma'));
vi.mock('fs-extra', () => import('./__mocks__/fs-extra'));

// Import the mocks
import { prisma } from '../lib/prisma';
import fs from 'fs-extra';


const DATA_DIR = '/fake/data';

/** Builds a fresh Fastify instance with graphicRoutes registered. */
async function buildApp() {
    const app = Fastify({ logger: false });
    app.register(graphicRoutes(DATA_DIR));
    await app.ready();
    return app;
}

/** A minimal valid POST body */
const validBody = {
    name: 'Test Lower Third',
    html: '<html><body>Hello</body></html>',
    json: { config: { width: 1920, height: 1080 }, elements: [] },
};

// ─── Reset mocks before every test ────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
});

// ===========================================================================
// SUITE 1: POST /api/graphics
// ===========================================================================
describe('POST /api/graphics', () => {

    // ── Test 1.1 ─────────────────────────────────────────────────────────────
    it('1.1 — saves a new graphic successfully and returns success, id, filePath', async () => {
        const app = await buildApp();
        const fakeGraphic = {
            id: 'aaaaaaaa-0000-0000-0000-000000000001',
            filePath: '/graphics/aaaaaaaa-0000-0000-0000-000000000001.html',
        };

        vi.mocked(prisma.graphic.upsert).mockResolvedValue(fakeGraphic as any);

        const res = await app.inject({
            method: 'POST',
            url: '/api/graphics',
            payload: { ...validBody, id: fakeGraphic.id },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.id).toBe(fakeGraphic.id);
        expect(body.filePath).toBe(fakeGraphic.filePath);

        // Verify DB was called
        expect(prisma.graphic.upsert).toHaveBeenCalledOnce();
    });

    // ── Test 1.2 ─────────────────────────────────────────────────────────────
    it('1.2 — updates an existing graphic when an id is provided', async () => {
        const app = await buildApp();
        const existingId = 'bbbbbbbb-0000-0000-0000-000000000002';
        vi.mocked(prisma.graphic.upsert).mockResolvedValue({
            id: existingId,
            filePath: `/graphics/${existingId}.html`,
        } as any);

        const res = await app.inject({
            method: 'POST',
            url: '/api/graphics',
            payload: { ...validBody, id: existingId },
        });

        expect(res.statusCode).toBe(200);
        // The upsert where clause should use the provided id
        const upsertCall = vi.mocked(prisma.graphic.upsert).mock.calls[0][0];
        expect(upsertCall.where.id).toBe(existingId);
        expect(upsertCall.update.name).toBe(validBody.name);
    });

    // ── Test 1.3 ─────────────────────────────────────────────────────────────
    it('1.3 — auto-generates a UUID when no id is provided', async () => {
        const app = await buildApp();
        vi.mocked(prisma.graphic.upsert).mockResolvedValue({
            id: 'auto-generated-uuid',
            filePath: '/graphics/auto-generated-uuid.html',
        } as any);

        const res = await app.inject({
            method: 'POST',
            url: '/api/graphics',
            // No id in the payload
            payload: validBody,
        });

        expect(res.statusCode).toBe(200);
        // The upsert where id should be a UUID string (truthy and non-empty)
        const upsertCall = vi.mocked(prisma.graphic.upsert).mock.calls[0][0];
        expect(upsertCall.where.id).toBeTruthy();
        expect(typeof upsertCall.where.id).toBe('string');
    });

    // ── Test 1.4 ─────────────────────────────────────────────────────────────
    it('1.4 — links graphic to a project when projectId is provided and no existing link', async () => {
        const app = await buildApp();
        const projectId = 'proj-0001';
        const graphicId = 'cccccccc-0000-0000-0000-000000000003';

        vi.mocked(prisma.graphic.upsert).mockResolvedValue({
            id: graphicId,
            filePath: `/graphics/${graphicId}.html`,
        } as any);
        // No existing link
        vi.mocked(prisma.playlistItem.findFirst)
            .mockResolvedValueOnce(null)   // existingLink check
            .mockResolvedValueOnce(null);  // lastItem check
        vi.mocked(prisma.playlistItem.create).mockResolvedValue({} as any);

        const res = await app.inject({
            method: 'POST',
            url: '/api/graphics',
            payload: { ...validBody, id: graphicId, projectId },
        });

        expect(res.statusCode).toBe(200);
        expect(prisma.playlistItem.create).toHaveBeenCalledOnce();
        const createCall = vi.mocked(prisma.playlistItem.create).mock.calls[0][0];
        expect(createCall.data.projectId).toBe(projectId);
        expect(createCall.data.graphicId).toBe(graphicId);
        expect(createCall.data.order).toBe(0); // First item, order starts at 0
    });

    // ── Test 1.5 ─────────────────────────────────────────────────────────────
    it('1.5 — does NOT create a duplicate playlist link if one already exists', async () => {
        const app = await buildApp();
        const projectId = 'proj-0002';
        const graphicId = 'dddddddd-0000-0000-0000-000000000004';

        vi.mocked(prisma.graphic.upsert).mockResolvedValue({
            id: graphicId,
            filePath: `/graphics/${graphicId}.html`,
        } as any);
        // Simulate an existing link
        vi.mocked(prisma.playlistItem.findFirst).mockResolvedValueOnce({
            id: 'existing-link',
            projectId,
            graphicId,
            order: 0,
        } as any);

        const res = await app.inject({
            method: 'POST',
            url: '/api/graphics',
            payload: { ...validBody, id: graphicId, projectId },
        });

        expect(res.statusCode).toBe(200);
        // playlistItem.create must NOT have been called
        expect(prisma.playlistItem.create).not.toHaveBeenCalled();
    });

    // ── Test 1.6 ─────────────────────────────────────────────────────────────
    it('1.6 — returns 500 when the database throws an error', async () => {
        const app = await buildApp();
        vi.mocked(prisma.graphic.upsert).mockRejectedValue(new Error('DB connection lost'));

        const res = await app.inject({
            method: 'POST',
            url: '/api/graphics',
            payload: validBody,
        });

        expect(res.statusCode).toBe(500);
        expect(res.json()).toEqual({ error: 'Failed to save graphic' });
    });
});

// ===========================================================================
// SUITE 1 (continued): GET /api/graphics
// ===========================================================================
describe('GET /api/graphics', () => {

    // ── Test 1.7 ─────────────────────────────────────────────────────────────
    it('1.7 — lists all graphics ordered by updatedAt descending', async () => {
        const app = await buildApp();
        const mockGraphics = [
            { id: 'g1', name: 'Graphic A', thumbnail: null, filePath: '/graphics/g1.html', updatedAt: new Date('2026-03-10') },
            { id: 'g2', name: 'Graphic B', thumbnail: null, filePath: '/graphics/g2.html', updatedAt: new Date('2026-03-09') },
        ];
        vi.mocked(prisma.graphic.findMany).mockResolvedValue(mockGraphics as any);

        const res = await app.inject({ method: 'GET', url: '/api/graphics' });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body).toHaveLength(2);
        expect(body[0].id).toBe('g1');

        // Confirm the query was ordered correctly
        const queryCall = vi.mocked(prisma.graphic.findMany).mock.calls[0][0];
        expect(queryCall?.orderBy).toEqual({ updatedAt: 'desc' });
    });

    // ── Test 1.8 ─────────────────────────────────────────────────────────────
    it('1.8 — returns an empty array when no graphics exist', async () => {
        const app = await buildApp();
        vi.mocked(prisma.graphic.findMany).mockResolvedValue([]);

        const res = await app.inject({ method: 'GET', url: '/api/graphics' });

        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual([]);
    });
});

// ===========================================================================
// SUITE 1 (continued): GET /api/graphics/:id
// ===========================================================================
describe('GET /api/graphics/:id', () => {

    // ── Test 1.9 ─────────────────────────────────────────────────────────────
    it('1.9 — retrieves a specific graphic and parses rawJson into a json field', async () => {
        const app = await buildApp();
        const sourceJson = { config: { width: 1920, height: 1080 }, elements: [] };
        vi.mocked(prisma.graphic.findUnique).mockResolvedValue({
            id: 'g-specific',
            name: 'My Graphic',
            thumbnail: null,
            filePath: '/graphics/g-specific.html',
            rawJson: JSON.stringify(sourceJson),
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any);

        const res = await app.inject({ method: 'GET', url: '/api/graphics/g-specific' });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.id).toBe('g-specific');
        // Verify rawJson was parsed and exposed as .json
        expect(body.json).toBeDefined();
        expect(body.json.config.width).toBe(1920);
    });

    // ── Test 1.10 ────────────────────────────────────────────────────────────
    it('1.10 — returns 404 when the graphic does not exist', async () => {
        const app = await buildApp();
        vi.mocked(prisma.graphic.findUnique).mockResolvedValue(null);

        const res = await app.inject({ method: 'GET', url: '/api/graphics/nonexistent-id' });

        expect(res.statusCode).toBe(404);
        expect(res.json()).toEqual({ error: 'Graphic not found' });
    });
});

// ===========================================================================
// SUITE 4: File System Operations (within graphics POST)
// ===========================================================================
describe('File System Operations (POST /api/graphics)', () => {

    // ── Test 4.1 ─────────────────────────────────────────────────────────────
    it('4.1 — writes the HTML file with the correct {uuid}.html filename', async () => {
        const app = await buildApp();
        const graphicId = 'eeeeeeee-1111-1111-1111-000000000005';
        vi.mocked(prisma.graphic.upsert).mockResolvedValue({
            id: graphicId,
            filePath: `/graphics/${graphicId}.html`,
        } as any);

        await app.inject({
            method: 'POST',
            url: '/api/graphics',
            payload: { ...validBody, id: graphicId },
        });

        // The file path passed to outputFile must follow the {uuid}.html convention
        const outputFileCall = vi.mocked(fs.outputFile).mock.calls[0];
        const writtenPath: string = outputFileCall[0] as string;
        expect(writtenPath).toContain(`${graphicId}.html`);
        expect(writtenPath).toContain('graphics');
    });

    // ── Test 4.2 ─────────────────────────────────────────────────────────────
    it('4.2 — writes the exact HTML content from the request body verbatim', async () => {
        const app = await buildApp();
        const exactHtml = '<!DOCTYPE html><html><head><title>Graphyne</title></head><body><p>Test</p></body></html>';
        vi.mocked(prisma.graphic.upsert).mockResolvedValue({
            id: 'some-id',
            filePath: '/graphics/some-id.html',
        } as any);

        await app.inject({
            method: 'POST',
            url: '/api/graphics',
            payload: { ...validBody, html: exactHtml },
        });

        const outputFileCall = vi.mocked(fs.outputFile).mock.calls[0];
        const writtenContent = outputFileCall[1] as string;
        expect(writtenContent).toBe(exactHtml);
    });

    // ── Test 4.3 ─────────────────────────────────────────────────────────────
    it('4.3 — calls ensureDir before outputFile to guarantee the directory exists', async () => {
        const app = await buildApp();
        vi.mocked(prisma.graphic.upsert).mockResolvedValue({
            id: 'some-id-2',
            filePath: '/graphics/some-id-2.html',
        } as any);

        await app.inject({
            method: 'POST',
            url: '/api/graphics',
            payload: validBody,
        });

        // Both must have been called, and ensureDir must come first
        expect(fs.ensureDir).toHaveBeenCalledOnce();
        expect(fs.outputFile).toHaveBeenCalledOnce();

        const ensureDirOrder = vi.mocked(fs.ensureDir).mock.invocationCallOrder[0];
        const outputFileOrder = vi.mocked(fs.outputFile).mock.invocationCallOrder[0];
        expect(ensureDirOrder).toBeLessThan(outputFileOrder);
    });
});