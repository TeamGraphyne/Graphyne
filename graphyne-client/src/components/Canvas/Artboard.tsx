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
  // Ensure we are selecting from the present state (if using redux-undo)
  const { elements, selectedIds, canvasConfig } = useSelector((state: RootState) => state.canvas.present);
  
  const trRef = useRef<Konva.Transformer>(null);

  // --- 1. TRANSFORMER / SELECTION LOGIC ---
  useEffect(() => {
    if (trRef.current) {
      const stage = trRef.current.getStage();
      
      // Map over ALL selected IDs to find their corresponding Konva nodes
      const selectedNodes = selectedIds
        .map((id) => stage?.findOne('#' + id))
        // Filter out any undefined results (in case an ID doesn't exist on stage yet)
        .filter((node): node is Konva.Node => node !== undefined);

      // Attach the transformer to the array of nodes
      trRef.current.nodes(selectedNodes);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedIds, elements]);

  // --- 2. KEYBOARD SHORTCUTS (DELETE) ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
      e.preventDefault(); // Prevent browser back navigation
      // Remove every currently selected ID
      selectedIds.forEach((id) => dispatch(removeElement(id)));
    }
  }, [selectedIds, dispatch]);

  // Attach keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // --- 3. DESELECTION HANDLER ---
  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Check if the click target is the Stage itself (empty area)
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
        // Listener on Stage for deselecting when clicking empty space
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
      >
        <Layer>
          {/* Background Rect - Explicitly handles deselect as well */}
          <Rect 
            name="background"
            width={canvasConfig.width} 
            height={canvasConfig.height} 
            fill={canvasConfig.background} 
            onMouseDown={() => dispatch(selectElement(null))} 
          />
          
          {elements.map((el) => {
            const props = {
              key: el.id,
              ...el,
              draggable: true,
              // --- 4. CLICK HANDLER (SHIFT+CLICK) ---
              onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
                // Stop the click from bubbling to the background
                e.cancelBubble = true;

                if (e.evt.shiftKey) {
                  // If Shift is held, toggle this item in/out of selection
                  dispatch(toggleSelection(el.id));
                } else {
                  // If standard click, perform exclusive select
                  // (Only if it's not already selected, to prevent jitter)
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
              }
            };

            // Render specific shape based on type
            if (el.type === 'rect') return <Rect {...props} />;
            if (el.type === 'circle') return <Circle {...props} />;
            if (el.type === 'text') return <Text {...props} />;
            return null;
          })}
          
          {/* Transformer Component */}
          <Transformer ref={trRef} />
        </Layer>
      </Stage>
    </div>
  );
};