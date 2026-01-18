export type ElementType = 'rect' | 'circle' | 'text' | 'image';

export interface ShadowEffect {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface GraphicElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean; 
  locked: boolean;
  zIndex: number;
  
  // Style Props
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  shadow?: ShadowEffect;

  // Text Specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
}

export interface CanvasConfig {
  width: number;      
  height: number;      
  backgroundColor: string;
}