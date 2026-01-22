import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { ProjectData } from '../types/project';
import { v4 as uuidv4 } from 'uuid';

export const projectRoutes = (projectsDir: string) => async (fastify: FastifyInstance) => {

    // GET: List all projects
    // Returns a summary list (ID, Name, Thumbnail) for the dashboard
    fastify.get('/api/projects', async (request, reply) => {
        try {
            const projects = await prisma.project.findMany({
                select: {
                    id: true,
                    name: true,
                    version: true,
                    thumbnail: true,
                    updatedAt: true
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            });
            return projects;
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch projects' });
        }
    });


    // GET: Load a specific project
    // Fetches the project, its elements, then reshapes it 
    // to match the 'ProjectData' interface expected by the frontend
    fastify.get<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
        const { id } = request.params;

        try {
            const project = await prisma.project.findUnique({
                where: { id },
                include: {
                    elements: true // Join the elements table
                }
            });

            if (!project) {
                return reply.code(404).send({ error: 'Project not found' });
            }

            // RESHAPE: Database (Flat) -> Frontend (Nested)
            const responseData: ProjectData = {
                id: project.id,
                name: project.name,
                version: project.version,
                lastModified: project.updatedAt.getTime(),
                thumbnail: project.thumbnail || undefined,
                config: {
                    width: project.width,
                    height: project.height,
                    background: project.background // Mapped from 'background' column
                },
                // Map elements back to CanvasElement shape
                elements: project.elements.map(el => ({
                    id: el.id,
                    type: el.type as any, // Cast string back to 'rect'|'text' etc.
                    name: el.name,
                    x: el.x,
                    y: el.y,
                    width: el.width,
                    height: el.height,
                    rotation: el.rotation,
                    scaleX: el.scaleX,
                    scaleY: el.scaleY,
                    zIndex: el.zIndex,
                    fill: el.fill,
                    stroke: el.stroke || '',
                    opacity: el.opacity,
                    text: el.text || undefined,
                    src: el.src || undefined,
                    isLocked: false,  // Default
                    isVisible: true,  // Default
                }))
            };

            return responseData;

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Failed to load project' });
        }
    });

    // POST: Save (Create or Update) a project
    // Uses a Transaction to ensure the project and elements 
    // are saved together atomically.
    fastify.post<{ Body: ProjectData }>('/api/projects', async (request, reply) => {
        const data = request.body;

        // Validate
        if (!data.elements || !Array.isArray(data.elements)) {
            return reply.code(400).send({ error: 'Invalid project format: missing elements' });
        }

        const projectId = data.id || uuidv4();

        try {
            // We use a transaction to:
            // 1. Upsert the Project details
            // 2. Delete ALL old elements for this project
            // 3. Create ALL new elements (Fresh state)
            const result = await prisma.$transaction(async (tx) => {

                // 1. Update or Create Project
                const project = await tx.project.upsert({
                    where: { id: projectId },
                    update: {
                        name: data.name,
                        version: data.version,
                        thumbnail: data.thumbnail,
                        width: data.config.width,
                        height: data.config.height,
                        background: data.config.background,
                    },
                    create: {
                        id: projectId,
                        name: data.name,
                        version: data.version || '1.0.0',
                        thumbnail: data.thumbnail,
                        width: data.config.width,
                        height: data.config.height,
                        background: data.config.background,
                    }
                });

                // 2. Clear old elements
                await tx.element.deleteMany({
                    where: { projectId: projectId }
                });

                // 3. Insert new elements
                if (data.elements.length > 0) {
                    await tx.element.createMany({
                        data: data.elements.map(el => ({
                            id: el.id, // Keep the frontend ID
                            projectId: projectId,
                            type: el.type,
                            name: el.name,
                            x: el.x,
                            y: el.y,
                            width: el.width,
                            height: el.height,
                            rotation: el.rotation || 0,
                            scaleX: el.scaleX || 1,
                            scaleY: el.scaleY || 1,
                            zIndex: el.zIndex || 0,
                            fill: el.fill,
                            stroke: el.stroke,
                            opacity: el.opacity ?? 1,
                            text: el.text,
                            src: el.src
                        }))
                    });
                }

                return project;
            });

            return { success: true, id: result.id };

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Failed to save project' });
        }
    });
};