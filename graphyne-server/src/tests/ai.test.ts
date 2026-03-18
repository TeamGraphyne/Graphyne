/**
 * Test Suite: AI Routes (src/routes/ai.ts)
 *
 * POST /api/ai/generate
 *
 * Strategy: mock `child_process.spawn` so no Python process is ever started.
 * We control stdout/stderr/exit-code by emitting events on the fake child object.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { EventEmitter } from 'events';

// ─── Mock child_process BEFORE importing the route ────────────────────────────
// vi.mock is hoisted to the top of the file by Vitest, so this is safe.
vi.mock('child_process', () => ({
    spawn: vi.fn(),
}));

// Also mock the fs `existsSync` used in getPythonBin so it doesn't check real disk
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        existsSync: vi.fn().mockReturnValue(false), // Force fallback to 'python3'
    };
});

import { spawn } from 'child_process';
import { aiRoutes } from '../routes/ai';

// ─── Helper: build a fake child process ───────────────────────────────────────
/**
 * Creates a fake ChildProcess-like EventEmitter with stdout and stderr streams.
 * Call `simulateSuccess(json)` or `simulateError(code, msg)` to drive the test.
 */
function makeFakeChild() {
    const child = new EventEmitter() as any;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();

    child.simulateSuccess = (jsonPayload: object) => {
        child.stdout.emit('data', Buffer.from(JSON.stringify(jsonPayload)));
        child.emit('close', 0);
    };

    child.simulateInvalidJson = (rawStdout: string) => {
        child.stdout.emit('data', Buffer.from(rawStdout));
        child.emit('close', 0);
    };

    child.simulateProcessError = (exitCode: number, stderrMsg: string) => {
        child.stderr.emit('data', Buffer.from(stderrMsg));
        child.emit('close', exitCode);
    };

    child.simulateSpawnError = (err: Error) => {
        child.emit('error', err);
        // After 'error', 'close' is NOT emitted — matches real behaviour
    };

    return child;
}

// ─── App factory ─��─��──────────────────────────────────────────────────────────
async function buildApp() {
    const app = Fastify({ logger: false });
    app.register(aiRoutes);
    await app.ready();
    return app;
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ===========================================================================
// SUITE: POST /api/ai/generate — Input Validation
// ===========================================================================
describe('POST /api/ai/generate — input validation', () => {

    it('AI-1 — returns 400 when prompt is missing', async () => {
        const app = await buildApp();

        const res = await app.inject({
            method: 'POST',
            url: '/api/ai/generate',
            payload: {},
        });

        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('prompt is required');
        // spawn must NOT be called for invalid input
        expect(spawn).not.toHaveBeenCalled();
    });

    it('AI-2 — returns 400 when prompt is an empty string', async () => {
        const app = await buildApp();

        const res = await app.inject({
            method: 'POST',
            url: '/api/ai/generate',
            payload: { prompt: '   ' }, // whitespace only
        });

        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('prompt is required');
        expect(spawn).not.toHaveBeenCalled();
    });

    it('AI-3 — returns 400 when prompt exceeds 500 characters', async () => {
        const app = await buildApp();
        const longPrompt = 'a'.repeat(501);

        const res = await app.inject({
            method: 'POST',
            url: '/api/ai/generate',
            payload: { prompt: longPrompt },
        });

        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('prompt must be under 500 characters');
        expect(spawn).not.toHaveBeenCalled();
    });

    it('AI-4 — accepts a prompt at exactly 500 characters (boundary)', async () => {
        const app = await buildApp();
        const boundary = 'a'.repeat(500);

        // Set up a successful fake child so this doesn't fail on pipeline
        const fakeChild = makeFakeChild();
        vi.mocked(spawn).mockReturnValue(fakeChild);
        setTimeout(() => fakeChild.simulateSuccess({ name: 'test', config: {}, elements: [] }), 0);

        const res = await app.inject({
            method: 'POST',
            url: '/api/ai/generate',
            payload: { prompt: boundary },
        });

        // Should NOT be rejected by the length guard
        expect(res.statusCode).not.toBe(400);
    });
});

// ===========================================================================
// SUITE: POST /api/ai/generate — Pipeline Success
// ===========================================================================
describe('POST /api/ai/generate — pipeline success', () => {

    it('AI-5 — returns 200 and the parsed design object on a successful pipeline run', async () => {
        const app = await buildApp();

        const mockDesign = {
            name: 'Lower Third',
            config: { width: 1920, height: 1080, background: '#000000' },
            elements: [{ id: 'el-1', type: 'text', name: 'Title', text: 'Hello' }],
        };

        const fakeChild = makeFakeChild();
        vi.mocked(spawn).mockReturnValue(fakeChild);

        // Emit success asynchronously (as a real process would)
        setTimeout(() => fakeChild.simulateSuccess(mockDesign), 0);

        const res = await app.inject({
            method: 'POST',
            url: '/api/ai/generate',
            payload: { prompt: 'Create a lower third for a news broadcast' },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.name).toBe('Lower Third');
        expect(body.config.width).toBe(1920);
        expect(Array.isArray(body.elements)).toBe(true);
    });

    it('AI-6 — trims the prompt before passing it to the pipeline', async () => {
        const app = await buildApp();

        const fakeChild = makeFakeChild();
        vi.mocked(spawn).mockReturnValue(fakeChild);
        setTimeout(() => fakeChild.simulateSuccess({ name: 'ok', config: {}, elements: [] }), 0);

        await app.inject({
            method: 'POST',
            url: '/api/ai/generate',
            payload: { prompt: '  sports scoreboard  ' },
        });

        // The third spawn argument (the prompt) should be trimmed
        const spawnArgs = vi.mocked(spawn).mock.calls[0];
        const inlineScriptArgs = spawnArgs[1] as string[];
        // The last element of the args array is the prompt passed to sys.argv[1]
        const passedPrompt = inlineScriptArgs[inlineScriptArgs.length - 1];
        expect(passedPrompt).toBe('sports scoreboard');
    });
});

// ===========================================================================
// SUITE: POST /api/ai/generate — Pipeline Failures
// ===========================================================================
describe('POST /api/ai/generate — pipeline failures', () => {

    it('AI-7 — returns 500 when the Python process exits with a non-zero code', async () => {
        const app = await buildApp();

        const fakeChild = makeFakeChild();
        vi.mocked(spawn).mockReturnValue(fakeChild);
        setTimeout(() => fakeChild.simulateProcessError(1, 'ModuleNotFoundError: No module named agno'), 0);

        const res = await app.inject({
            method: 'POST',
            url: '/api/ai/generate',
            payload: { prompt: 'Create a scoreboard' },
        });

        expect(res.statusCode).toBe(500);
        const body = res.json();
        expect(body.error).toBe('AI generation failed');
        // detail should contain the pipeline error text
        expect(body.detail).toContain('Pipeline exited with code 1');
    });

    it('AI-8 — returns 500 when the pipeline returns invalid (non-JSON) stdout', async () => {
        const app = await buildApp();

        const fakeChild = makeFakeChild();
        vi.mocked(spawn).mockReturnValue(fakeChild);
        setTimeout(() => fakeChild.simulateInvalidJson('this is not json at all'), 0);

        const res = await app.inject({
            method: 'POST',
            url: '/api/ai/generate',
            payload: { prompt: 'Create a ticker' },
        });

        expect(res.statusCode).toBe(500);
        expect(res.json().error).toBe('AI generation failed');
        expect(res.json().detail).toContain('Pipeline returned invalid JSON');
    });

    it('AI-9 — returns 500 when spawn itself throws (Python not found)', async () => {
        const app = await buildApp();

        const fakeChild = makeFakeChild();
        vi.mocked(spawn).mockReturnValue(fakeChild);
        setTimeout(() => fakeChild.simulateSpawnError(new Error('spawn python3 ENOENT')), 0);

        const res = await app.inject({
            method: 'POST',
            url: '/api/ai/generate',
            payload: { prompt: 'Create a logo sting' },
        });

        expect(res.statusCode).toBe(500);
        expect(res.json().error).toBe('AI generation failed');
        expect(res.json().detail).toContain('Failed to spawn Python process');
    });
});