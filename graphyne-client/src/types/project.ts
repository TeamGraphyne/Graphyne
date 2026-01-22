import type { CanvasConfig, CanvasElement } from './canvas';

export interface ProjectData {
    id: string;
    name: string;
    version: string;
    lastModified: number;
    config: CanvasConfig;
    elements: CanvasElement[];
    thumbnail?: string;
}