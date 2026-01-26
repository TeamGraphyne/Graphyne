import axios from 'axios';
import type { ProjectData, GraphicData } from '../types/project';

const API_URL = 'http://localhost:3001/api';
const client = axios.create({ baseURL: API_URL });

export const api = {
    // [UPDATED] Accepts id for updates and optional projectId
    saveGraphic: async (payload: { id?: string | null, name: string, html: string, json: object, projectId?: string | null }) => {
        return await client.post<{ success: true, id: string, filePath: string }>('/graphics', payload);
    },

    getGraphics: async () => {
        const response = await client.get<GraphicData[]>('/graphics');
        return response.data;
    },

    getProjects: async () => {
        const response = await client.get<{ id: string, name: string }[]>('/projects');
        return response.data;
    },

    getProjectById: async (id: string) => {
        const response = await client.get<ProjectData>(`/projects/${id}`);
        return response.data;
    }
};