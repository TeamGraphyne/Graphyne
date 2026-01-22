import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Type definition for the Editor Payload
interface SaveGraphicBody {
    id?: string;
    name: string;
    html: string;
    json: any;
    thumbnail?: string;
}

export const graphicRoutes = (dataDir: string) => async (fastify: FastifyInstance) => {

    // POST: Save a Graphic (HTML + JSON)
    fastify.post<{ Body: SaveGraphicBody }>('/api/graphics', async (request, reply) => {
        const { id, name, html, json, thumbnail } = request.body;

        // 1. Generate ID if new
        const graphicId = id || uuidv4();

        try {
            // 2. Write the HTML file to disk
            // We save it in: /data/graphics/{uuid}.html
            const fileName = `${graphicId}.html`;
            const graphicsDir = path.join(dataDir, 'graphics');
            const filePath = path.join(graphicsDir, fileName);

            // Ensure folder exists
            await fs.ensureDir(graphicsDir);
            await fs.outputFile(filePath, html);

            // 3. Save Metadata to Database
            const graphic = await prisma.graphic.upsert({
                where: { id: graphicId },
                update: {
                    name,
                    thumbnail,
                    rawJson: JSON.stringify(json), // Store JSON as string for backup/editing
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

            return { success: true, id: graphic.id, filePath: graphic.filePath };

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Failed to save graphic' });
        }
    });

    // GET: List All Graphics (For Import)
    fastify.get('/api/graphics', async (request, reply) => {
        const graphics = await prisma.graphic.findMany({
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                thumbnail: true,
                filePath: true, // The URL the playout engine needs
                updatedAt: true
            }
        });
        return graphics;
    });

    // GET: Load One Graphic (For Editing)
    fastify.get<{ Params: { id: string } }>('/api/graphics/:id', async (request, reply) => {
        const graphic = await prisma.graphic.findUnique({
            where: { id: request.params.id }
        });

        if (!graphic) return reply.code(404).send({ error: 'Graphic not found' });

        // Parse the JSON back into an object so the frontend Redux can consume it
        return {
            ...graphic,
            json: JSON.parse(graphic.rawJson)
        };
    });
};