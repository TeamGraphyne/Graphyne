import { vi } from 'vitest';

const fsMock = {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    ensureDirSync: vi.fn().mockReturnValue(undefined),
    outputFile: vi.fn().mockResolvedValue(undefined),
};

export default fsMock;