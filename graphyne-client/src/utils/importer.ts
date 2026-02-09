import { type CanvasConfig, type CanvasElement } from "../types/canvas";

interface GraphicState {
    config: CanvasConfig;
    elements: CanvasElement[];
}

export const parseHtmlGraphic = async (file: File): Promise<GraphicState> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const html = e.target?.result as string;
            if (!html) return reject("Empty file");

            // Create a virtual DOM to parse the file
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // Find the state script tag
            const script = doc.getElementById("graphyne-source");
            if (!script || !script.textContent) {
                return reject("Invalid Graphyne File: No source data found.");
            }

            try {
                const json = JSON.parse(script.textContent);
                resolve(json);
            } catch (err) {
                reject("Failed to parse Graphic JSON: " + err);
            }
        };

        reader.readAsText(file);
    });
};