import axios from "axios";
import type { ProjectData, GraphicData } from "../types/project";
import type { DataSourceData, DataSourceConnectionConfig, DataField } from "../types/datasource";

const API_URL = "http://localhost:3001/api";
const client = axios.create({ baseURL: API_URL });

export const api = {
  // --- Graphics ---
  saveGraphic: async (payload: {
    id?: string | null;
    name: string;
    html: string;
    json: object;
    projectId?: string | null;
  }) => {
    return await client.post<{ success: true; id: string; filePath: string }>(
      "/graphics",
      payload,
    );
  },

  getGraphics: async () => {
    const response = await client.get<GraphicData[]>("/graphics");
    return response.data;
  },

  // --- Projects ---
  getProjects: async () => {
    const response =
      await client.get<{ id: string; name: string }[]>("/projects");
    return response.data;
  },

  getProjectById: async (id: string) => {
    const response = await client.get<ProjectData>(`/projects/${id}`);
    return response.data;
  },

  createProject: async (name: string) => {
    const response = await client.post<{ id: string; name: string }>(
      "/projects",
      { name },
    );
    return response.data;
  },

  // NEW: Added updateProject to save re-ordered or removed rundown items to the DB
  updateProject: async (id: string, name: string, items: { graphicId: string; order: number }[]) => {
    const response = await client.post<{ success: boolean; id: string }>("/projects", {
      id,
      name,
      items,
    });
    return response.data;
  },

  deleteProject: async (id: string) => {
    await client.delete(`/projects/${id}`);
  },

  importGraphic: async (file: File, projectId?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (projectId) formData.append("projectId", projectId);

    const response = await client.post("/graphics/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
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