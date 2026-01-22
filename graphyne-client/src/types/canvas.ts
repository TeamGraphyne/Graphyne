export interface CanvasElement {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'image';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  zIndex?: number;
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
  // Shape specific
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  // Image specific
  src?: string;
  // Animation
  inAnimation?: { type: string; duration: number; delay: number };
}

// Canvas Config Interface
export interface CanvasConfig {
  width: number;
  height: number;
  background: string;
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedIds: string[];
  config: CanvasConfig; // <--- ADD THIS
}