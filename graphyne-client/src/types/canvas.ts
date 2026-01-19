export type ElementType = 'rect' | 'circle' | 'text' | 'image';
export type AnimationType = 'fade' | 'slide-left' | 'slide-right' | 'scale' | 'none';

export interface AnimationConfig {
  type: AnimationType;
  duration: number;
  delay: number;
  ease: string;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  name: string;
  // Position & Dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // Style Props
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius?: number; // For Rect
  text?: string;         // For Text
  fontSize?: number;     // For Text
  src?: string;          // For Image
  // Effects
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  // State
  isLocked: boolean;
  isVisible: boolean;
  inAnimation: AnimationConfig;
  outAnimation: AnimationConfig;
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedIds: string[];
  canvasConfig: {
    width: number;
    height: number;
    background: string;
  };
}