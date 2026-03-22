import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { v4 as uuidv4 } from "uuid";

interface SaveProjectBody {
  id?: string;
  name: string;
  items: {
    graphicId: string;
    order: number;
  }[];
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
}

export const projectRoutes = async (fastify: FastifyInstance) => {
  // GET: List All Projects (Playlists)
  fastify.get("/api/projects", async () => {
    return await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { items: true } },
      },
    });
  });

  // GET: Load a Project (Playlist with Graphics)
  fastify.get<{ Params: { id: string } }>(
    "/api/projects/:id",
    async (request, reply) => {
      const project = await prisma.project.findUnique({
        where: { id: request.params.id },
        include: {
          items: {
            include: {
              graphic: true, // Fetch the Graphic details (filePath!) for each item
            },
          },
        },
      });
      return project;
    },
  );

  // POST: Save a Project (Playlist)
  fastify.post<{ Body: SaveProjectBody }>(
    "/api/projects",
    async (request, reply) => {
      const { id, name, items } = request.body;
      const projectId = id || uuidv4();

      try {
        const result = await prisma.$transaction(async (tx) => {
          // 1. Upsert Project Header
          const project = await tx.project.upsert({
            where: { id: projectId },
            update: { name },
            create: { id: projectId, name },
          });

          // 2. Clear old items
          await tx.playlistItem.deleteMany({
            where: { projectId: projectId },
          });

          // 3. Create new items
          if (items && items.length > 0) {
            await Promise.all(
              items.map((item, index) =>
                tx.playlistItem.create({
                  data: {
                    projectId: projectId,
                    graphicId: item.graphicId,
                    order: index, // Ensure order is saved based on array position
                  },
                }),
              ),
            );
          }
          return project;
        });

        return { success: true, id: result.id };
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: "Failed to save project" });
      }
    },
  );
};