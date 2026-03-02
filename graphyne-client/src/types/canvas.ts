export interface ShadowEffect {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export type EasingValue =
  | 'none'
  | 'power4.in'
  | 'power4.out'
  | 'power4.inOut'
  | 'back.in(1.7)'
  | 'back.out(1.7)'
  | 'back.inOut(1.7)'
  | 'bounce.out'
  | 'elastic.out(1, 0.3)'
  | (string & {});

  export type AnimationType =
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'scale';

export interface AnimationConfig {
  type: AnimationType;
  duration: number;
  delay: number;
  easing?: EasingValue;
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