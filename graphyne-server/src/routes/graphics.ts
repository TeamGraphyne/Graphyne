import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Updated Interface
interface SaveGraphicBody {
    id?: string;
    name: string;
    html: string;
    json: any;
    thumbnail?: string;
    projectId?: string; // [NEW] Optional Project ID
}

export const graphicRoutes = (dataDir: string) => async (fastify: FastifyInstance) => {

    // POST: Save a Graphic (HTML + JSON) + Link to Project
    fastify.post<{ Body: SaveGraphicBody }>('/api/graphics', async (request, reply) => {
        const { id, name, html, json, thumbnail, projectId } = request.body;

        const graphicId = id || uuidv4();

        try {
            // 1. File Operations
            const fileName = `${graphicId}.html`;
            const graphicsDir = path.join(dataDir, 'graphics');
            const filePath = path.join(graphicsDir, fileName);

            await fs.ensureDir(graphicsDir);
            await fs.outputFile(filePath, html);

            // 2. Database: Upsert Graphic
            const graphic = await prisma.graphic.upsert({
                where: { id: graphicId },
                update: {
                    name,
                    thumbnail,
                    rawJson: JSON.stringify(json),
                    filePath: `/graphics/${fileName}`
                },
                create: {
                    id: graphicId,
                    name,
                    thumbnail,
                    rawJson: JSON.stringify(json),
                    filePath: `/graphics/${fileName}`
                }
            });

            // 3. Database: Link to Project (Playlist)
            if (projectId) {
                // A. Check if already linked to prevent duplicates
                const existingLink = await prisma.playlistItem.findFirst({
                    where: {
                        projectId,
                        graphicId: graphic.id
                    }
                });

                // B. If not linked, add it to the end of the list
                if (!existingLink) {
                    // Find the current highest 'order' number
                    const lastItem = await prisma.playlistItem.findFirst({
                        where: { projectId },
                        orderBy: { order: 'desc' }
                    });
                    
                    const newOrder = (lastItem?.order ?? -1) + 1;

                    await prisma.playlistItem.create({
                        data: {
                            projectId,
                            graphicId: graphic.id,
                            order: newOrder
                        }
                    });
                }
            }

            return { success: true, id: graphic.id, filePath: graphic.filePath };

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Failed to save graphic' });
        }
    });

    // ... (Keep existing GET routes) ...
    fastify.get('/api/graphics', async (request, reply) => {
        const graphics = await prisma.graphic.findMany({
            orderBy: { updatedAt: 'desc' },
            select: { id: true, name: true, thumbnail: true, filePath: true, updatedAt: true }
        });
        return graphics;
    });

    fastify.get<{ Params: { id: string } }>('/api/graphics/:id', async (request, reply) => {
        const graphic = await prisma.graphic.findUnique({ where: { id: request.params.id } });
        if (!graphic) return reply.code(404).send({ error: 'Graphic not found' });
        return { ...graphic, json: JSON.parse(graphic.rawJson) };
    });
};