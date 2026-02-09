import axios from "axios";
import type { ProjectData, GraphicData } from "../types/project";

const API_URL = "http://localhost:3001/api";
const client = axios.create({ baseURL: API_URL });

export const api = {
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
};
