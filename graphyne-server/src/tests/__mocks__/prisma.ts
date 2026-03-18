// Mock for src/lib/prisma.ts
// Replaces all Prisma calls with vi.fn() stubs so tests never touch the real DB.

import { vi } from 'vitest';

export const prisma = {
    graphic: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
    playlistItem: {
        findFirst: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
        createMany: vi.fn(),
    },
    project: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
    },
    // NEW: DataSource model for datasources.ts and server.ts socket events
    dataSource: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
    },
    $transaction: vi.fn(),
};