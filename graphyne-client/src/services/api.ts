import axios from 'axios';
import type { ProjectData } from '../types/project';

// Configuration
const API_URL = 'http://localhost:3001/api';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const api = {
    // 1. Fetch all projects
    getProjects: async () => {
        const response = await client.get<{ id: string; filename: string }[]>('/projects');
        return response.data;
    },

    // 2. Load a specific project
    getProjectById: async (id: string) => {
        const response = await client.get<ProjectData>(`/projects/${id}`);
        return response.data;
    },

    // 3. Save a project
    saveProject: async (project: ProjectData) => {
        const response = await client.post<{ success: true; id: string }>('/projects', project);
        return response.data;
    },

    // 4. Upload an asset (Image/Video)
    uploadAsset: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await client.post<{ url: string }>('/assets/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data; // Returns { url: "http://localhost:3001/uploads/image.png" }
    }
};