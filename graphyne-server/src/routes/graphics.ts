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

interface CreateGraphicBody {
  name: string;
  html: string;
  json: any;
  thumbnail?: string;
}

interface UpdateGraphicBody {
  name: string;
  html: string;
  json: any;
  thumbnail?: string;
}

//list all graphics belonging to a specific project
export const graphicRoutes = (dataDir: string) => async (fastify: FastifyInstance) => {
  fastify.get<{ Params: { projectId: string } }> (
    "/api/projects/:projectId/graphics",
    async (request, reply) => {
      try {
        const items = await prisma.playlistItem.findMany({
          where: { projectId: request.params.projectId },
          orderBy: { order: "asc" },
          include: { 
            graphic: {
              select: {
                id: true,
                name: true,
                thumbnail: true,
                filePath: true,
                updatedAt: true,
              },
            },
          },
        });
        //return just the graphics array 
        return items.map(item => item.graphic);
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: "Failed to fetch graphics" });
      }
    }
  );

  //fetch a single graphic with full json data for loading into the editor
  fastify.get<{ Params: { id: string} }>(
    "/api/graphics/:id",
    async (request, reply) => {
      const graphic = await prisma.graphic.findUnique({
        where: { id: request.params.id },
      });
      if (!graphic) return reply.code(404).send({ error: "Graphic not found" });
      return { ...graphic, json: JSON.parse(graphic.rawJson) };
    }
  );

  //POST

  fastify.post<{ Body: SaveGraphicBody }>('/api/graphics', async (request, reply) => {
        const { id, name, html, json, thumbnail, projectId } = request.body;
        const graphicId = id || uuidv4();

        try {
            const fileName = `${graphicId}.html`;
            const graphicsDir = path.join(dataDir, 'graphics');
            const filePath = path.join(graphicsDir, fileName);
            await fs.ensureDir(graphicsDir);
            await fs.outputFile(filePath, html);

            const graphic = await prisma.graphic.upsert({
                where: { id: graphicId },
                update: {
                    name,
                    thumbnail,
                    rawJson: JSON.stringify(json),
                    filePath: `/graphics/${fileName}`,
                },
                create: {
                    id: graphicId,
                    name,
                    thumbnail,
                    rawJson: JSON.stringify(json),
                    filePath: `/graphics/${fileName}`,
                },
            });

            if (projectId) {
                const existingLink = await prisma.playlistItem.findFirst({
                    where: { projectId, graphicId: graphic.id },
                });
                if (!existingLink) {
                    const lastItem = await prisma.playlistItem.findFirst({
                        where: { projectId },
                        orderBy: { order: 'desc' },
                    });
                    const newOrder = (lastItem?.order ?? -1) + 1;
                    await prisma.playlistItem.create({
                        data: { projectId, graphicId: graphic.id, order: newOrder },
                    });
                }
            }

            return { success: true, id: graphic.id, filePath: graphic.filePath };
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Failed to save graphic' });
        }
    });

    //PATCH

    fastify.patch<{ Params: { id: string }; Body: UpdateGraphicBody }>(
        '/api/graphics/:id',
        async (request, reply) => {
            const { name, html, json, thumbnail } = request.body;
            const graphicId = request.params.id;

            try {
                // 1. Check graphic exists before touching the filesystem
                const existing = await prisma.graphic.findUnique({
                    where: { id: graphicId },
                });
                if (!existing) {
                    return reply.code(404).send({ error: 'Graphic not found' });
                }

                // 2. Overwrite the HTML file on disk
                const fileName = `${graphicId}.html`;
                const graphicsDir = path.join(dataDir, 'graphics');
                const filePath = path.join(graphicsDir, fileName);
                await fs.ensureDir(graphicsDir);
                await fs.outputFile(filePath, html);

                // 3. Update the database record
                const graphic = await prisma.graphic.update({
                    where: { id: graphicId },
                    data: {
                        name,
                        thumbnail,
                        rawJson: JSON.stringify(json),
                        filePath: `/graphics/${fileName}`,
                    },
                });

                return { success: true, id: graphic.id };
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ error: 'Failed to update graphic' });
            }
        }
    );

    //DELETE
    
    fastify.delete<{ Params: { id: string } }>(
        '/api/graphics/:id',
        async (request, reply) => {
            const graphicId = request.params.id;

            try {
                const existing = await prisma.graphic.findUnique({
                    where: { id: graphicId },
                });
                if (!existing) {
                    return reply.code(404).send({ error: 'Graphic not found' });
                }

                await prisma.$transaction(async (tx) => {
                    // 1. Remove all playlist links first (foreign key constraint)
                    await tx.playlistItem.deleteMany({
                        where: { graphicId },
                    });

                    // 2. Delete the graphic record
                    await tx.graphic.delete({
                        where: { id: graphicId },
                    });
                });

                // 3. Delete the HTML file from disk (outside transaction — not rollbackable)
                const fileName = `${graphicId}.html`;
                const filePath = path.join(dataDir, 'graphics', fileName);
                await fs.remove(filePath);

                return { success: true };
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ error: 'Failed to delete graphic' });
            }
        }
    );
};