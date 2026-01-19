import { useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Transformer } from 'react-konva';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { 
  selectElement, 
  updateElement, 
  toggleSelection, 
  removeElement 
} from '../../store/canvasSlice';
import Konva from 'konva';

export const Artboard = () => {
  const dispatch = useDispatch();
  // Access present state for redux-undo compatibility
  const { elements, selectedIds, canvasConfig } = useSelector((state: RootState) => state.canvas.present);
  
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  // --- 1. TRANSFORMER / SELECTION LOGIC ---
  useEffect(() => {
    if (trRef.current && layerRef.current) {
      const stage = trRef.current.getStage();
      
      // Find nodes matching selectedIds
      const selectedNodes = selectedIds
        .map((id) => stage?.findOne('#' + id))
        .filter((node): node is Konva.Node => node !== undefined);

      trRef.current.nodes(selectedNodes);
      trRef.current.getLayer()?.batchDraw();
    }
    // Removed 'elements' from dependency array to prevent re-running on every element change
  }, [selectedIds]);

  // --- 2. KEYBOARD SHORTCUTS (DELETE) ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only trigger if not typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
      e.preventDefault();
      selectedIds.forEach((id) => dispatch(removeElement(id)));
    }
  }, [selectedIds, dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // --- 3. DESELECTION HANDLER ---
  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      dispatch(selectElement(null)); 
    }
  };

  return (
    <div className="flex-1 bg-gray-900 flex justify-center items-center overflow-auto p-10 outline-none">
      <Stage 
        width={canvasConfig.width} 
        height={canvasConfig.height} 
        scaleX={0.5}
        scaleY={0.5}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
      >
        <Layer ref={layerRef}>
          {/* Background Rect */}
          <Rect 
            name="background"
            width={canvasConfig.width} 
            height={canvasConfig.height} 
            fill={canvasConfig.background} 
            onMouseDown={() => dispatch(selectElement(null))} 
          />
          
          {elements.map((el) => {
            const props = {
              ...el,
              draggable: !el.isLocked,
              onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
                e.cancelBubble = true;
                if (e.evt.shiftKey) {
                  dispatch(toggleSelection(el.id));
                } else {
                  if (!selectedIds.includes(el.id) || selectedIds.length > 1) {
                    dispatch(selectElement(el.id));
                  }
                }
              },
              onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                dispatch(updateElement({
                  id: el.id,
                  props: { x: e.target.x(), y: e.target.y() }
                }));
              },
              onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
                // Sync transform changes back to store
                const node = e.target;
                dispatch(updateElement({
                  id: el.id,
                  props: {
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    scaleX: node.scaleX(),
                    scaleY: node.scaleY(),
                  }
                }));
              }
            };

            if (!el.isVisible) return null;

            if (el.type === 'rect') return <Rect key={el.id} {...props} />;
            if (el.type === 'circle') return <Circle key={el.id} {...props} />;
            if (el.type === 'text') return <Text key={el.id} {...props} />;
            return null;
          })}
          
          <Transformer ref={trRef} />
        </Layer>
      </Stage>
    </div>
  );
};