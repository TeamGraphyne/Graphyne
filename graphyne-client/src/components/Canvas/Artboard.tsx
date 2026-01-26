import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Text, Transformer } from "react-konva";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectElement,
  updateElement,
  toggleSelection,
  removeElement,
  setSelection,
  setZoom,
} from "../../store/canvasSlice";
import Konva from "konva";

export const Artboard = () => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle redux-undo structure (present) or flat structure fallback
  const { elements, selectedIds, config } = useAppSelector(
    (state) => state.canvas.present || state.canvas,
  );

  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // --- SELECTION RECTANGLE STATE ---
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    isSelecting: boolean;
  } | null>(null);

  // --- AUTO-FIT CANVAS ON MOUNT ---
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const padding = 40; // padding around canvas

      const availableWidth = container.clientWidth - padding;
      const availableHeight = container.clientHeight - padding;

      const scaleX = availableWidth / config.width;
      const scaleY = availableHeight / config.height;

      // Use the smaller scale to fit both dimensions
      const initialZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

      dispatch(setZoom(initialZoom));
    }
  }, [config.width, config.height, dispatch]); // Only run once on mount

  // --- TRANSFORMER SYNC ---
  useEffect(() => {
    if (trRef.current && layerRef.current) {
      const stage = trRef.current.getStage();
      const selectedNodes = selectedIds
        .map((id) => stage?.findOne("#" + id))
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
    const id = node.id();

    dispatch(
      updateElement({
        id: id,
        x: node.x(),
        y: node.y(),
      }),
    );
  };

  // --- SELECTION RECTANGLE LOGIC ---
const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const isBackground = e.target === e.target.getStage() || e.target.name() === 'background';

    if (isBackground) {
      const stage = e.target.getStage();
      if (!stage) return;

      dispatch(selectElement(null)); 

      const pos = stage.getPointerPosition();
      if (pos) {
        setSelectionBox({
          x: pos.x / config.zoom,
          y: pos.y / config.zoom,
          width: 0,
          height: 0,
          isSelecting: true
        });
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
        width: pos.x / config.zoom - selectionBox.x,
        height: pos.y / config.zoom - selectionBox.y,
      });
    }
  };

  const onMouseUp = () => {
    if (selectionBox?.isSelecting && stageRef.current) {
      const box = {
        x: Math.min(selectionBox.x, selectionBox.x + selectionBox.width),
        y: Math.min(selectionBox.y, selectionBox.y + selectionBox.height),
        width: Math.abs(selectionBox.width),
        height: Math.abs(selectionBox.height),
      };

      const shapes = stageRef.current.find(".rect, .circle, .text");
      const selected = shapes.filter((shape) => {
        return Konva.Util.haveIntersection(box, shape.getClientRect());
      });

      const ids = selected.map((s) => s.id());
      dispatch(setSelection(ids));
    }
    setSelectionBox(null);
  };

  // --- KEYBOARD SHORTCUTS ---
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        selectedIds.forEach((id) => dispatch(removeElement(id)));
      }
    },
    [selectedIds, dispatch],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!config) return <div>Loading Canvas...</div>;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Stage
        ref={stageRef}
        width={config.width * config.zoom}
        height={config.height * config.zoom}
        scaleX={config.zoom}
        scaleY={config.zoom}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchMove={onMouseMove}
        onTouchEnd={onMouseUp}
        style={{
          backgroundColor: "transparent",
          border: "1px solid #444",
        }}
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
            const { zIndex, type, ...elementProps } = el;

            const commonProps = {
              ...elementProps,
              name: el.type,
              draggable: !el.isLocked,
              listening: true,
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

              // [UPDATED] Live Resize Logic (HTML-First)
              // Instead of scaling, we calculate new width/height and reset scale to 1.
              onTransform: (e: Konva.KonvaEventObject<Event>) => {
                 const node = e.target;
                 const scaleX = node.scaleX();
                 const scaleY = node.scaleY();

                 // Reset scale so it doesn't compound or distort
                 node.scaleX(1);
                 node.scaleY(1);

                 // Apply calculated size
                 // (Math.max prevents collapsing to 0)
                 node.width(Math.max(5, node.width() * scaleX));
                 node.height(Math.max(5, node.height() * scaleY));
              },

              // [UPDATED] Save Final Dimensions
              onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
                const node = e.target;
                dispatch(
                  updateElement({
                    id: el.id,
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    width: node.width(),
                    height: node.height(),
                    scaleX: 1, // Always force 1
                    scaleY: 1, // Always force 1
                  }),
                );
              },
            };

            if (el.isVisible === false) return null;

            if (el.type === "rect")
              return <Rect key={el.id} {...commonProps} />;
            
            // [UPDATED] Circle Adapter: Map Width to Radius to support resizing
            if (el.type === "circle")
              return (
                  <Circle 
                    key={el.id} 
                    {...commonProps} 
                    // Konva Circle uses radius, not width/height.
                    // We map width to radius (assuming aspect ratio 1:1 or circle fits inside box)
                    radius={el.width / 2} 
                    // Fix offset because Rect origin is top-left, Circle is center
                    offsetX={-el.width / 2}
                    offsetY={-el.height / 2}
                  />
              );
            
            if (el.type === "text")
              return <Text key={el.id} {...commonProps} verticalAlign="middle" />;
            
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
              strokeWidth={1 / config.zoom}
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
    </div>
  );
};