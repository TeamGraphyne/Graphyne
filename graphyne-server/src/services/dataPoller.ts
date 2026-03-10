// MODIFIED: Added csvRowState tracking and setCsvRow method
import { Server } from 'socket.io';
import fs from 'fs-extra';
import path from 'path';

// --- Types ---
interface PollerConfig {
    id: string;
    name: string;
    type: 'rest-api' | 'json-file' | 'csv-file';
    url?: string;
    filePath?: string;
    headers?: Record<string, string>;
    rootPath?: string;
    pollingInterval: number; // seconds
}

interface ActivePoller {
    config: PollerConfig;
    interval: NodeJS.Timeout;
}

// --- Utility: Flatten nested object to dot-notation ---
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj || {})) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenObject(value as Record<string, unknown>, fullPath));
        } else {
            result[fullPath] = value;
        }
    }
    return result;
}

// --- Utility: Navigate into a nested path ---
function navigatePath(obj: unknown, pathStr?: string): unknown {
    if (!pathStr) return obj;
    return pathStr.split('.').reduce((current: unknown, key: string) => {
        if (current && typeof current === 'object') {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

// --- Utility: Parse CSV string into flat records ---
function parseCsv(csvText: string): Record<string, unknown>[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const record: Record<string, unknown> = {};
        headers.forEach((h, i) => {
            const val = values[i] || '';
            // Attempt to parse as number
            const num = Number(val);
            record[h] = isNaN(num) || val === '' ? val : num;
        });
        return record;
    });
}

// --- Detect fields from a flat data object ---
function detectFields(data: Record<string, unknown>): { path: string; type: string; sampleValue: string }[] {
    return Object.entries(data).map(([path, value]) => {
        let type = 'string';
        if (typeof value === 'number') type = 'number';
        else if (typeof value === 'boolean') type = 'boolean';
        else if (typeof value === 'string' && (value.startsWith('http') && (value.endsWith('.png') || value.endsWith('.jpg') || value.endsWith('.svg')))) {
            type = 'image-url';
        }
        return { path, type, sampleValue: String(value ?? '') };
    });
}

// --- The Poller Service ---
export class DataPollerService {
    private activePollers: Map<string, ActivePoller> = new Map();
    // NEW: Track the currently selected row for CSV files
    private csvRowState: Map<string, number> = new Map();
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    // Perform a single fetch for a source
    async fetchOnce(config: PollerConfig): Promise<{ flat: Record<string, unknown>; fields: { path: string; type: string; sampleValue: string }[] }> {
        let rawData: unknown;

        if (config.type === 'rest-api' && config.url) {
            const res = await fetch(config.url, {
                headers: config.headers || {},
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            rawData = await res.json();
        } else if (config.type === 'json-file' && config.filePath) {
            const content = await fs.readFile(config.filePath, 'utf-8');
            rawData = JSON.parse(content);
        } else if (config.type === 'csv-file' && config.filePath) {
            const content = await fs.readFile(config.filePath, 'utf-8');
            const rows = parseCsv(content);
            
            // MODIFIED: Fetch the currently selected row instead of always row 0
            const requestedIndex = this.csvRowState.get(config.id) || 0;
            const validIndex = rows.length > 0 ? Math.max(0, Math.min(requestedIndex, rows.length - 1)) : 0;
            const row = rows.length > 0 ? rows[validIndex] : {};
            
            // Inject metadata into the object
            rawData = { ...row, __rowCount: rows.length, __currentRow: validIndex };
        } else {
            throw new Error(`Invalid source config: type=${config.type}`);
        }

        // Navigate to rootPath if specified
        const scoped = navigatePath(rawData, config.rootPath);

        // Flatten to dot-notation
        const flat = (scoped && typeof scoped === 'object')
            ? flattenObject(scoped as Record<string, unknown>)
            : {};

        const fields = detectFields(flat);

        return { flat, fields };
    }

    // Start polling a source on an interval
    start(config: PollerConfig) {
        // Don't double-start
        if (this.activePollers.has(config.id)) {
            console.log(`⚡ Poller already running for ${config.id}`);
            return;
        }
        if (config.pollingInterval <= 0) {
            console.log(`⏸️ Source ${config.name ?? config.id} has no polling interval, skipping auto-poll.`);
            return;
        }

        console.log(`📡 Starting poller: "${config.id}" every ${config.pollingInterval}s`);

        const poll = async () => {
            try {
                const { flat, fields } = await this.fetchOnce(config);
                this.io.emit('data:update', { sourceId: config.id, data: flat });
                // Optionally emit detected fields so clients can update their UI
                this.io.emit('data:fields', { sourceId: config.id, fields });
            } catch (err) {
                console.error(`❌ Poll failed for ${config.id}:`, err);
                this.io.emit('data:error', { sourceId: config.id, error: String(err) });
            }
        };

        // Initial poll immediately
        poll();

        // Then on interval
        const interval = setInterval(poll, config.pollingInterval * 1000);
        this.activePollers.set(config.id, { config, interval });
    }

    // Stop polling a specific source
    stop(sourceId: string) {
        const poller = this.activePollers.get(sourceId);
        if (poller) {
            clearInterval(poller.interval);
            this.activePollers.delete(sourceId);
            console.log(`🛑 Stopped poller: ${sourceId}`);
        }
    }

    // Stop all pollers (e.g., on shutdown)
    stopAll() {
        for (const [id] of this.activePollers) {
            this.stop(id);
        }
    }

    // NEW: Update active row and immediately push data
    async setCsvRow(sourceId: string, rowIndex: number) {
        this.csvRowState.set(sourceId, rowIndex);
        const poller = this.activePollers.get(sourceId);
        
        if (poller) {
            console.log(`📄 Switching CSV row for ${sourceId} to ${rowIndex}`);
            try {
                const { flat } = await this.fetchOnce(poller.config);
                this.io.emit('data:update', { sourceId, data: flat });
            } catch (err) {
                console.error(`❌ Failed to fetch new CSV row for ${sourceId}:`, err);
            }
        }
    }

    isRunning(sourceId: string): boolean {
        return this.activePollers.has(sourceId);
    }
}