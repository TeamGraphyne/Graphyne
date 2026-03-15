import { CanvasElement, CanvasConfig } from './canvas';

export interface ProjectData {
    id: string;              // UUID
    name: string;            // Project Name 
    version: string;         // e.g., "1.0.0"
    lastModified: number;    // Timestamp

    // The core content
    config: CanvasConfig;    // Width, Height, Background
    elements: CanvasElement[]; // All the shapes/text

    // Optional: Preview image for the dashboard
    thumbnail?: string;      // Base64 string or URL
}