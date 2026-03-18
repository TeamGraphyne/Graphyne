import React, { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import type { CanvasElement } from '../../types/canvas';

// 1. Define strict event handler types
interface CanvasEvents {
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransform?: (e: Konva.KonvaEventObject<Event>) => void;
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void;
}

// 2. Define the exact props
export interface CanvasImageProps 
  extends Omit<CanvasElement, 'type' | 'zIndex'>, CanvasEvents {
  draggable?: boolean;
  listening?: boolean;
}

export const CanvasImage: React.FC<CanvasImageProps> = ({ 
  src,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  inAnimation,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  outAnimation,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isLocked,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isVisible,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shadow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  blendMode,
  ...konvaProps 
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    
    const img = new window.Image();
    img.src = src;
    img.onload = () => setImage(img);

    return () => {
        img.onload = null;
    };
  }, [src]);

  return (
    <KonvaImage
      image={image || undefined}
      {...konvaProps}
    />
  );
};