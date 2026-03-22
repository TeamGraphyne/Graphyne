import axios from "axios";
import type { ProjectData, GraphicData } from "../types/project";
import type { DataSourceData, DataSourceConnectionConfig, DataField } from "../types/datasource";
import type { CanvasConfig, CanvasElement } from "../types/canvas";

const API_URL = `http://${window.location.hostname}:3001/api`;
const client = axios.create({ baseURL: API_URL });

export interface AiDesignResult {
    name: string;
    config: CanvasConfig;
    elements: CanvasElement[];
}

export const api = {

    // --- AI ---
    generateGraphic: async (
        prompt: string,
        apiKey: string,
        currentDesign?: { config: CanvasConfig; elements: CanvasElement[] }
    ): Promise<AiDesignResult> => {
        const response = await client.post<AiDesignResult>('/ai/generate', { prompt, apiKey, currentDesign });
        return response.data;
    },

    // --- Graphics ---

    // READ (list) — filtered by project
    getGraphics: async (projectId: string) => {
        const response = await client.get<GraphicData[]>(`/projects/${projectId}/graphics`);
        return response.data;
    },

    // READ (single) — full data including elements and config
    getGraphic: async (graphicId: string) => {
        const response = await client.get<GraphicData>(`/graphics/${graphicId}`);
        return response.data;
    },

    // CREATE — always tied to a project
    createGraphic: async (projectId: string, payload: {
        name: string;
        html: string;
        json: object;
    }) => {
        const response = await client.post<{ success: true; id: string; filePath: string }>(
            `/projects/${projectId}/graphics`,
            payload,
        );
        return response.data;
    },

    // UPDATE — patches existing graphic by id
    updateGraphic: async (graphicId: string, payload: {
        name: string;
        html: string;
        json: object;
    }) => {
        const response = await client.patch<{ success: true; id: string }>(
            `/graphics/${graphicId}`,
            payload,
        );
        return response.data;
    },

    // DELETE
    deleteGraphic: async (graphicId: string) => {
        await client.delete(`/graphics/${graphicId}`);
    },

    // IMPORT (multipart — special case, stays as its own method)
    importGraphic: async (file: File, projectId?: string) => {
        const formData = new FormData();
        formData.append("file", file);
        if (projectId) formData.append("projectId", projectId);
        const response = await client.post("/graphics/import", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    },

    // --- Projects ---
    getProjects: async () => {
        const response = await client.get<{ id: string; name: string }[]>("/projects");
        return response.data;
    },

    getProjectById: async (id: string) => {
        const response = await client.get<ProjectData>(`/projects/${id}`);
        return response.data;
    },

    createProject: async (name: string) => {
        const response = await client.post<{ id: string; name: string }>("/projects", { name });
        return response.data;
    },

    updateProject: async (id: string, name: string, items: { graphicId: string; order: number }[]) => {
        const response = await client.post<{ success: boolean; id: string }>("/projects", { id, name, items });
        return response.data;
    },

    deleteProject: async (id: string) => {
        await client.delete(`/projects/${id}`);
    },

    // --- Data Sources ---
    getDataSources: async (projectId: string): Promise<DataSourceData[]> => {
        const response = await client.get(`/projects/${projectId}/datasources`);
        return response.data;
    },

    saveDataSource: async (projectId: string, payload: {
        id?: string;
        name: string;
        type: string;
        config: DataSourceConnectionConfig;
        pollingInterval: number;
        autoStart: boolean;
        fields?: DataField[];
    }): Promise<{ success: boolean; id: string; source: DataSourceData }> => {
        const response = await client.post(`/projects/${projectId}/datasources`, payload);
        return response.data;
    },

    deleteDataSource: async (id: string) => {
        await client.delete(`/datasources/${id}`);
    },

    testDataSource: async (payload: {
        type: string;
        config: DataSourceConnectionConfig;
    }): Promise<{ success: boolean; fields: DataField[]; sampleData: Record<string, unknown> }> => {
        const response = await client.post('/datasources/test', payload);
        return response.data;
    },

    startPolling: async (sourceId: string) => {
        await client.post(`/datasources/${sourceId}/start`);
    },

    stopPolling: async (sourceId: string) => {
        await client.post(`/datasources/${sourceId}/stop`);
    },
};