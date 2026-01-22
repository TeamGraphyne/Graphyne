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
    graphic: GraphicData; // The nested details
}

export interface ProjectData {
    id: string;
    name: string;
    items: PlaylistItem[];
    updatedAt: string;
}