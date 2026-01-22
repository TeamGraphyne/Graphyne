import axios from 'axios';
import type { ProjectData, GraphicData } from '../types/project';
import type { CanvasState } from '../types/canvas';

const API_URL = 'http://localhost:3001/api';
const client = axios.create({ baseURL: API_URL });

export const api = {
    // --- GRAPHICS (Editor) ---
    saveGraphic: async (payload: { name: string, html: string, json: CanvasState }) => {
        return await client.post<{ success: true, id: string }>('/graphics', payload);
    },

    getGraphics: async () => {
        const response = await client.get<GraphicData[]>('/graphics');
        return response.data;
    },

    // --- PROJECTS (Playout) ---
    getProjects: async () => {
        const response = await client.get<{ id: string, name: string }[]>('/projects');
        return response.data;
    },

    getProjectById: async (id: string) => {
        const response = await client.get<ProjectData>(`/projects/${id}`);
        return response.data;
    }
};