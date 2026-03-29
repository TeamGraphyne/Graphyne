import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import type { DataPollerService } from '../services/dataPoller';
import { requireRole } from '../server';

// The route factory accepts the poller so routes can trigger test/start/stop
export const datasourceRoutes = (poller: DataPollerService) => async (fastify: FastifyInstance) => {

        fastify.addHook('preHandler', requireRole(['admin', 'editor']));
    

    // --- GET: List all data sources for a project ---
    fastify.get<{ Params: { projectId: string } }>(
        '/api/projects/:projectId/datasources',
        async (request) => {
            const sources = await prisma.dataSource.findMany({
                where: { projectId: request.params.projectId },
                orderBy: { createdAt: 'asc' },
            });
            // Parse JSON fields for the client
            return sources.map(s => ({
                ...s,
                config: JSON.parse(s.config),
                fields: s.fields ? JSON.parse(s.fields) : [],
            }));
        }
    );

    // --- POST: Create or update a data source ---
    interface SaveBody {
        id?: string;
        name: string;
        type: string;
        config: object;
        pollingInterval: number;
        autoStart: boolean;
        fields?: object[];
    }

    fastify.post<{ Params: { projectId: string }; Body: SaveBody }>(
        '/api/projects/:projectId/datasources',
        async (request, reply) => {
            const { projectId } = request.params;
            const { id, name, type, config, pollingInterval, autoStart, fields } = request.body;
            const sourceId = id || uuidv4();

            try {
                const source = await prisma.dataSource.upsert({
                    where: { id: sourceId },
                    update: {
                        name,
                        type,
                        config: JSON.stringify(config),
                        pollingInterval,
                        autoStart,
                        fields: fields ? JSON.stringify(fields) : undefined,
                    },
                    create: {
                        id: sourceId,
                        projectId,
                        name,
                        type,
                        config: JSON.stringify(config),
                        pollingInterval,
                        autoStart,
                        fields: fields ? JSON.stringify(fields) : null,
                    },
                });

                return {
                    success: true,
                    id: source.id,
                    source: {
                        ...source,
                        config: JSON.parse(source.config),
                        fields: source.fields ? JSON.parse(source.fields) : [],
                    },
                };
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ error: 'Failed to save data source' });
            }
        }
    );

    // --- DELETE: Remove a data source ---
    fastify.delete<{ Params: { id: string } }>(
        '/api/datasources/:id',
        async (request, reply) => {
            try {
                // Stop polling if active
                poller.stop(request.params.id);

                await prisma.dataSource.delete({
                    where: { id: request.params.id },
                });
                return { success: true };
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ error: 'Failed to delete data source' });
            }
        }
    );

    // --- POST: Test a source connection (fetch once, return fields) ---
    fastify.post<{ Body: { type: string; config: { url?: string; filePath?: string; headers?: Record<string, string>; rootPath?: string } } }>(
        '/api/datasources/test',
        async (request, reply) => {
            try {
                const { type, config } = request.body;
                const result = await poller.fetchOnce({
                    id: 'test',
                    name: 'Test Source',
                    type: type as 'rest-api' | 'json-file' | 'csv-file',
                    url: config.url,
                    filePath: config.filePath,
                    headers: config.headers,
                    rootPath: config.rootPath,
                    pollingInterval: 0,
                });
                return { success: true, fields: result.fields, sampleData: result.flat };
            } catch (error) {
                return reply.code(400).send({ error: String(error) });
            }
        }
    );

    // --- POST: Start polling a specific source ---
    fastify.post<{ Params: { id: string } }>(
        '/api/datasources/:id/start',
        async (request, reply) => {
            try {
                const source = await prisma.dataSource.findUnique({ where: { id: request.params.id } });
                if (!source) return reply.code(404).send({ error: 'Source not found' });

                const config = JSON.parse(source.config);
                poller.start({
                    id: source.id,
                    name: source.name,
                    type: source.type as 'rest-api' | 'json-file' | 'csv-file',
                    url: config.url,
                    filePath: config.filePath,
                    headers: config.headers,
                    rootPath: config.rootPath,
                    pollingInterval: source.pollingInterval,
                });

                return { success: true, message: `Polling started for ${source.name}` };
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ error: 'Failed to start polling' });
            }
        }
    );

    // --- POST: Stop polling a specific source ---
    fastify.post<{ Params: { id: string } }>(
        '/api/datasources/:id/stop',
        async (request) => {
            poller.stop(request.params.id);
            return { success: true };
        }
    );
};