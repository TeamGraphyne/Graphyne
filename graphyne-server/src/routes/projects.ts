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

export const projectRoutes = async (fastify: FastifyInstance) => {

    // GET: List all projects with item count
    fastify.get("/api/projects", async () => {
        return await prisma.project.findMany({
            orderBy: { updatedAt: "desc" },
            include: {
                _count: { select: { items: true } },
            },
        });
    });

    // GET: Load a single project with all its graphics in playlist order
    fastify.get<{ Params: { id: string } }>(
        "/api/projects/:id",
        async (request, reply) => {
            const project = await prisma.project.findUnique({
                where: { id: request.params.id },
                include: {
                    items: {
                        orderBy: { order: 'asc' },
                        include: {
                            graphic: true,
                        },
                    },
                },
            });
            if (!project) return reply.code(404).send({ error: 'Project not found' });
            return project;
        }
    );

    // POST: Create or update a project and its playlist item order
    fastify.post<{ Body: SaveProjectBody }>(
        "/api/projects",
        async (request, reply) => {
            const { id, name, items } = request.body;
            const projectId = id || uuidv4();

            try {
                const result = await prisma.$transaction(async (tx) => {
                    // 1. Upsert project header
                    const project = await tx.project.upsert({
                        where: { id: projectId },
                        update: { name },
                        create: { id: projectId, name },
                    });

                    // 2. Clear existing playlist items
                    await tx.playlistItem.deleteMany({
                        where: { projectId },
                    });

                    // 3. Recreate items in the correct order
                    if (items && items.length > 0) {
                        await Promise.all(
                            items.map((item, index) =>
                                tx.playlistItem.create({
                                    data: {
                                        projectId,
                                        graphicId: item.graphicId,
                                        order: index,
                                    },
                                })
                            )
                        );
                    }

                    return project;
                });

                return { success: true, id: result.id };
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ error: "Failed to save project" });
            }
        }
    );

    // DELETE: Remove a project and all its playlist items that were called from the frontend but missing from routes until now
    fastify.delete<{ Params: { id: string } }>(
        "/api/projects/:id",
        async (request, reply) => {
            const projectId = request.params.id;

            try {
                const existing = await prisma.project.findUnique({
                    where: { id: projectId },
                });
                if (!existing) {
                    return reply.code(404).send({ error: 'Project not found' });
                }

                await prisma.$transaction(async (tx) => {
                    // 1. Delete playlist items first
                    await tx.playlistItem.deleteMany({
                        where: { projectId },
                    });

                    // 2. Delete the project itself
                    await tx.project.delete({
                        where: { id: projectId },
                    });
                });

                return { success: true };
            } catch (error) {
                request.log.error(error);
                return reply.code(500).send({ error: "Failed to delete project" });
            }
        }
    );
};