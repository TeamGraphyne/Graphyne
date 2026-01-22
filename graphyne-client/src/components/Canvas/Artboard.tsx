import { useEffect, useRef, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Transformer } from 'react-konva';
// Use the typed hooks defined in store/hooks.ts
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

  // Handle redux-undo structure (present) or flat structure fallback
  const { elements, selectedIds, config } = useAppSelector((state) => 
    state.canvas.present || state.canvas
  );
  
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // --- SELECTION RECTANGLE STATE ---
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number; isSelecting: boolean } | null>(null);

  // --- 1. TRANSFORMER SYNC ---
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

  // --- 2. DRAG HANDLERS ---
  const onDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    const id = e.target.id();
    if (!selectedIds.includes(id)) {
      dispatch(selectElement(id));
    }
  };

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const id = node.id();
    
    // Flatten payload. reducer expects { id, x, y }, NOT { id, props: { x, y } }
    dispatch(updateElement({
      id: id,
      x: node.x(),
      y: node.y()
    }));
  };

  // --- 3. SELECTION RECTANGLE LOGIC ---
  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const isElement = e.target !== e.target.getStage();
    // If clicking empty space, start selection box
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

  // --- 4. KEYBOARD SHORTCUTS ---
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

  const scale = 0.5;

  // Safeguard if config is not yet loaded
  if (!config) return <div>Loading Canvas...</div>;

  return (
    <Stage 
      ref={stageRef}
      width={config.width * scale} 
      height={config.height * scale} 
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
          width={config.width} 
          height={config.height} 
          fill={config.background} 
        />
        
        {elements.map((el) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const {zIndex, type, ...elementProps} = el;
          
          const commonProps = {
            ...elementProps,
            name: el.type, 
            draggable: !el.isLocked, // Now valid thanks to updated types
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
              // Fix 3: Flatten payload for transform update as well
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

          // Now valid thanks to updated types
          if (el.isVisible === false) return null; 

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