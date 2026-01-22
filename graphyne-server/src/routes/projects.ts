import { FastifyInstance } from 'fastify';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProjectData } from '../types/project';

export const projectRoutes = (projectsDir: string) => async (fastify: FastifyInstance) => {

    // POST: Save a project
    // We use the generic <{ Body: ProjectData }> to tell Fastify what to expect
    fastify.post<{ Body: ProjectData }>('/api/projects', async (request, reply) => {
        const project = request.body;

        // 1. Basic Validation (Type Guard)
        if (!project.elements || !Array.isArray(project.elements)) {
            return reply.code(400).send({ error: 'Invalid project format: missing elements' });
        }

        // 2. Save to disk
        // We trust 'id' exists because the Interface requires it, 
        // but good to default if missing in runtime
        const projectId = project.id || uuidv4();
        const filePath = path.join(projectsDir, `${projectId}.json`);

        // Add metadata before saving
        const fileContent: ProjectData = {
            ...project,
            id: projectId,
            lastModified: Date.now()
        };

        await fs.writeJSON(filePath, fileContent);

        return { success: true, id: projectId };
    });
};