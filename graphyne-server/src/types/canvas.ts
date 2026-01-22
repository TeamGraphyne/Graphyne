export type ElementType = 'rect' | 'circle' | 'text' | 'image';
export type AnimationType = 'fade' | 'slide-left' | 'slide-right' | 'scale' | 'none';

export interface ShadowEffect {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
}

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
    scaleX: number;
    scaleY: number;
    zIndex: number;

    // Style Props
    fill: string;
    stroke?: string;        // Made optional to match typical usage
    strokeWidth?: number;   // Made optional
    opacity: number;
    cornerRadius?: number;

    // Text Specific
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    align?: 'left' | 'center' | 'right';

    // Image Specific
    src?: string;

    // Effects
    shadow?: ShadowEffect;

    // State
    isLocked: boolean;
    isVisible: boolean;

    // Animation State
    inAnimation?: AnimationConfig;  // Optional to allow partial updates
    outAnimation?: AnimationConfig; // Optional
}

export interface CanvasConfig {
    width: number;
    height: number;
    background: string;
}

export interface CanvasState {
    elements: CanvasElement[];
    selectedIds: string[];
    canvasConfig: CanvasConfig;
}