import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Transformer } from 'react-konva';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  selectElement, 
  updateElement, 
  toggleSelection, 
  removeElement,
  setSelection
} from '../../store/canvasSlice';
import Konva from 'konva';

export const Artboard = () => {
  const dispatch = useAppDispatch();
  
  // 1. SELECTOR: Use 'canvasConfig' to match your latest Type definitions
  const { elements, selectedIds, canvasConfig } = useAppSelector((state) => 
    state.canvas.present || state.canvas
  );
  
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // --- SELECTION RECTANGLE STATE ---
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number; isSelecting: boolean } | null>(null);

  // --- TRANSFORMER SYNC ---
  useEffect(() => {
    if (trRef.current && layerRef.current) {
      const stage = trRef.current.getStage();
      const selectedNodes = selectedIds
        .map((id) => stage?.findOne('#' + id))
        .filter((node): node is Konva.Node => node !== undefined);

      trRef.current.nodes(selectedNodes);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, elements]); 


  // --- DRAG HANDLERS ---
  const onDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    const id = e.target.id();
    if (!selectedIds.includes(id)) {
      dispatch(selectElement(id));
    }
  };

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    dispatch(updateElement({
      id: node.id(),
      x: node.x(),
      y: node.y()
    }));
  };

  // --- SELECTION RECTANGLE LOGIC ---
  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const isElement = e.target !== e.target.getStage();
    if (!isElement) {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        setSelectionBox({
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          isSelecting: true
        });
        dispatch(selectElement(null)); 
      }
    }
  };

  const onMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!selectionBox?.isSelecting) return;
    
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    
    if (pos && selectionBox) {
      setSelectionBox({
        ...selectionBox,
        width: pos.x - selectionBox.x,
        height: pos.y - selectionBox.y,
      });
    }
  };

  const onMouseUp = () => {
    if (selectionBox?.isSelecting && stageRef.current) {
      const box = {
        x: Math.min(selectionBox.x, selectionBox.x + selectionBox.width),
        y: Math.min(selectionBox.y, selectionBox.y + selectionBox.height),
        width: Math.abs(selectionBox.width),
        height: Math.abs(selectionBox.height)
      };

      const shapes = stageRef.current.find('.rect, .circle, .text'); 
      const selected = shapes.filter((shape) => {
        return Konva.Util.haveIntersection(box, shape.getClientRect());
      });

      const ids = selected.map(s => s.id());
      dispatch(setSelection(ids));
    }
    setSelectionBox(null);
  };

  // --- KEYBOARD SHORTCUTS ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
      e.preventDefault();
      selectedIds.forEach((id) => dispatch(removeElement(id)));
    }
  }, [selectedIds, dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle Loading State
  if (!canvasConfig) return <div>Loading Canvas...</div>;

  const scale = 0.5;

  return (
    <Stage 
      ref={stageRef}
      width={canvasConfig.width * scale} 
      height={canvasConfig.height * scale} 
      scaleX={scale}
      scaleY={scale}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchStart={onMouseDown}
      onTouchMove={onMouseMove}
      onTouchEnd={onMouseUp}
      style={{ backgroundColor: 'transparent' }}
    >
      <Layer ref={layerRef}>
        <Rect 
          name="background"
          width={canvasConfig.width} 
          height={canvasConfig.height} 
          fill={canvasConfig.background} 
        />
        
        {elements.map((el) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const {zIndex, type, ...elementProps} = el;
          
          const commonProps = {
            ...elementProps,
            name: el.type, 
            draggable: !el.isLocked,
            onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
              e.cancelBubble = true;
              if (e.evt.shiftKey) {
                dispatch(toggleSelection(el.id));
              } else {
                if (!selectedIds.includes(el.id)) {
                  dispatch(selectElement(el.id));
                }
              }
            },
            onDragStart: onDragStart,
            onDragEnd: onDragEnd,
            onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
              const node = e.target;
              // 3. FIX: Send FLAT payload for transforms too
              dispatch(updateElement({
                id: el.id,
                x: node.x(),
                y: node.y(),
                rotation: node.rotation(),
                scaleX: node.scaleX(),
                scaleY: node.scaleY(),
              }));
            }
          };

          if (!el.isVisible) return null;

          if (el.type === 'rect') return <Rect key={el.id} {...commonProps} />;
          if (el.type === 'circle') return <Circle key={el.id} {...commonProps} />;
          if (el.type === 'text') return <Text key={el.id} {...commonProps} />;
          return null;
        })}
        
        {/* SELECTION RECTANGLE */}
        {selectionBox && selectionBox.isSelecting && (
          <Rect
            x={selectionBox.x}
            y={selectionBox.y}
            width={selectionBox.width}
            height={selectionBox.height}
            fill="rgba(0, 161, 255, 0.3)"
            stroke="#00a1ff"
            strokeWidth={1}
          />
        )}

        <Transformer 
          ref={trRef} 
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
};