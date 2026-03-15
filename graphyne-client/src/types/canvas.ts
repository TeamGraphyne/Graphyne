export interface ShadowEffect {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface AnimationConfig {
  type: string;
  duration: number;
  delay: number;
  ease?: string;
}

export interface CanvasElement {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'image';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  fillSecondary?: string;
  fillType?: 'solid' | 'linear' | 'radial';

  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  zIndex?: number;

  // State flags
  isVisible?: boolean;
  isLocked?: boolean;

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

  // Effects (Grouped for cleaner state)
  shadow?: ShadowEffect;

  // Animation
  inAnimation?: AnimationConfig;
  outAnimation?: AnimationConfig;

  // Data Binding
  dataBindings?: DataBinding[];
}

// MODIFIED: Removed 'zoom' — zoom is view-only state, now lives in viewSlice.
export interface CanvasConfig {
  width: number;
  height: number;
  background: string;
}

export interface CanvasState {
  elements: CanvasElement[];
  selectedIds: string[];
  config: CanvasConfig;
}

// New!!!
export interface DataBinding {
  sourceId: string;      // Which data source (UUID)
  sourceName: string;    // For UI display
  fieldPath: string;     
  targetProperty: string; 
  format?: string;       // Optional
}