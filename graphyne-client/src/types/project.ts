import type { DataSourceData } from "./datasource";

// 1. The Visual Asset (What the Editor creates)
export interface GraphicData {
    id: string;
    name: string;
    thumbnail?: string;
    filePath: string;  // The HTML URL
    rawJson: string;   // The Redux State for editing
    updatedAt: string;
}

// 2. The Playlist (What the Playout uses)
export interface PlaylistItem {
    id: string;
    graphicId: string;
    order: number;
    graphic: GraphicData; // Embed the graphic data for easy access in playout
    type?: "SERVER" |  "LOCAL_HTML"; //To show the miport html file in rundown 
    htmlContent?: string;
}

// 3. The Project (The overall container)
export interface ProjectData {
    id: string;
    name: string;
    items: PlaylistItem[];
    dataSources?: DataSourceData[];
    updatedAt: string;
}