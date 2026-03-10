import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Text, Transformer } from "react-konva";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectElement,
  updateElement,
  toggleSelection,
  removeElement,
  setSelection,
  nudgeElements,
  duplicateElements,
  // REMOVED: zoomIn, zoomOut, setZoom — no longer in canvasSlice
} from "../../store/canvasSlice";
import { zoomIn, zoomOut, setZoom } from "../../store/viewSlice"; // NEW: Import from viewSlice
import { ActionCreators } from "redux-undo";
import Konva from "konva";
import { CanvasImage } from "./CanvasImage";
import type { CanvasElement } from "../../types/canvas";

// Nudge distance constants (in canvas pixels)
const NUDGE_SMALL = 1;  // Arrow key
const NUDGE_LARGE = 10; // Shift + Arrow key

export const Artboard = () => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle redux-undo structure (present) or flat structure fallback
  const { elements, selectedIds, config, grid } = useAppSelector(
    (state) => state.canvas.present || state.canvas,
  );

  // NEW: Read zoom from the separate view slice (not undoable)
  const zoom = useAppSelector((state) => state.view.zoom);

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

    const snapped = snapBox({
      x: node.x(),
      y: node.y(),
      width: node.width(),
      height: node.height(),
    });

    node.position({
      x: snapped.x,
      y: snapped.y,
    });

    dispatch(
      updateElement({
        id,
        x: snapped.x,
        y: snapped.y,
      }),
    );
  };
  
  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
  if (!grid?.snap) return;

  const node = e.target;
  node.x(snap(node.x()));
  node.y(snap(node.y()));
};

  // --- SNAP TO GRID HELPER ---
  const GRID_SIZE = 20;

  const snap = (value: number) => {
    if (!grid?.snap) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

  const snapBox = (box: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    if (!grid?.snap) return box;

    return {
      x: snap(box.x),
      y: snap(box.y),
      width: Math.max(GRID_SIZE, snap(box.width)),
      height: Math.max(GRID_SIZE, snap(box.height)),
    };
  };

  // --- SELECTION RECTANGLE LOGIC ---
  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const isBackground =
      e.target === e.target.getStage() || e.target.name() === "background";

    if (isBackground) {
      const stage = e.target.getStage();
      if (!stage) return;

      dispatch(selectElement(null));

      const pos = stage.getPointerPosition();
      if (pos) {
        setSelectionBox({
          x: pos.x / zoom, // MODIFIED: Use zoom from viewSlice
          y: pos.y / zoom,
          width: 0,
          height: 0,
          isSelecting: true,
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
        width: pos.x / zoom - selectionBox.x, // MODIFIED: Use zoom from viewSlice
        height: pos.y / zoom - selectionBox.y,
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

  // ========== KEYBOARD SHORTCUTS ==========
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Guard: don't intercept when user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      // Platform-agnostic modifier check (Ctrl on Win/Linux, Cmd on Mac)
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // ---------- DELETE / BACKSPACE — Remove selected elements ----------
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0
      ) {
        e.preventDefault();
        selectedIds.forEach((id) => dispatch(removeElement(id)));
        return;
      }

      // ---------- ESCAPE — Deselect all ----------
      if (e.key === "Escape") {
        e.preventDefault();
        dispatch(selectElement(null));
        return;
      }

      // ---------- MODIFIER SHORTCUTS (Ctrl/Cmd + key) ----------
      if (isCtrlOrCmd) {
        // REDO — Ctrl+Shift+Z (must be checked BEFORE Undo, more specific combo)
        if (e.shiftKey && e.key.toLowerCase() === "z") {
          e.preventDefault();
          dispatch(ActionCreators.redo());
          return;
        }

        // UNDO — Ctrl+Z
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          dispatch(ActionCreators.undo());
          return;
        }

        // ZOOM IN — Ctrl+"=" or Ctrl+"+"
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          dispatch(zoomIn());
          return;
        }

        // ZOOM OUT — Ctrl+"-"
        if (e.key === "-") {
          e.preventDefault();
          dispatch(zoomOut());
          return;
        }

        // ZOOM RESET (FIT) — Ctrl+0
        if (e.key === "0") {
          e.preventDefault();
          if (containerRef.current) {
            const container = containerRef.current;
            const padding = 40;
            const fitZoom = Math.min(
              (container.clientWidth - padding) / config.width,
              (container.clientHeight - padding) / config.height,
              1,
            );
            dispatch(setZoom(fitZoom));
          }
          return;
        }

        // SELECT ALL — Ctrl+A
        if (e.key.toLowerCase() === "a") {
          e.preventDefault();
          const allVisibleIds = elements
            .filter((el) => el.isVisible !== false)
            .map((el) => el.id);
          dispatch(setSelection(allVisibleIds));
          return;
        }

        // DUPLICATE — Ctrl+D
        if (e.key.toLowerCase() === "d" && selectedIds.length > 0) {
          e.preventDefault();
          dispatch(duplicateElements(selectedIds));
          return;
        }
      }

      // ---------- ARROW KEYS — Nudge selected elements ----------
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
        selectedIds.length > 0
      ) {
        e.preventDefault();

        const distance = e.shiftKey ? NUDGE_LARGE : NUDGE_SMALL;
        let dx = 0;
        let dy = 0;

        switch (e.key) {
          case "ArrowUp":
            dy = -distance;
            break;
          case "ArrowDown":
            dy = distance;
            break;
          case "ArrowLeft":
            dx = -distance;
            break;
          case "ArrowRight":
            dx = distance;
            break;
        }

        dispatch(nudgeElements({ ids: selectedIds, dx, dy }));
      }
    },
    [selectedIds, elements, config.width, config.height, dispatch],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!config) return <div>Loading Canvas...</div>;

  const scale = 0.5;
  const checkerSize = 10;

  //Fill properties: Rect
  const getRectFillProps = (el: CanvasElement) => {
    if (el.fillType === "linear" && el.fillSecondary) {
      return {
        fillLinearGradientStartPoint: { x: 0, y:0 },
        fillLinearGradientEndPoint: { x: el.width, y: 0 },
        fillLinearGradientColorStops: [ 0, el.fill, 1, el.fillSecondary ],
      };
    }

    if (el.fillType == "radial" && el.fillSecondary) {
      return {
        fillRadialGradientStartPoint: { x: el.width / 2, y: el.height / 2 },
        fillRadialGradientEndPoint: { x: el.width / 2, y: el.height / 2 },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: Math.max(el.width, el.height) / 2,
        fillRadialGradientColorStops: [0, el.fill, 1, el.fillSecondary],
      };
    }

    return { fill: el.fill };
  };

  //Fill properties: Circle
  const getCircleFillProps = (el: CanvasElement) => {
    const radius = el.width / 2;

    if (el.fillType === "linear" && el.fillSecondary) {
      return {
        fillLinearGradientStartPoint: { x: -radius, y: 0 },
        fillLinearGradientEndPoint: { x: radius, y: 0 },
        fillLinearGradientColorStops: [0, el.fill, 1, el.fillSecondary],
      };
    } 

    if (el.fillType === "radial" && el.fillSecondary) {
      return {
        fillRadialGradientStartPoint: { x: 0, y: 0 },
        fillRadialGradientEndPoint: { x:0, y: 0 },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndRadius: radius,
        fillRadialGradientColorStops: [0, el.fill, 1, el.fillSecondary],
      };
    }

    return { fill: el.fill };
  }

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
        width={config.width * zoom}       // MODIFIED: Use zoom from viewSlice
        height={config.height * zoom}      // MODIFIED: Use zoom from viewSlice
        scaleX={zoom}                      // MODIFIED: Use zoom from viewSlice
        scaleY={zoom}                      // MODIFIED: Use zoom from viewSlice
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchMove={onMouseMove}
        onTouchEnd={onMouseUp}
        style={{
          backgroundColor: "#ffffff",
          backgroundImage: `linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
             linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
             linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
             linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`,
          backgroundSize: `${checkerSize / scale}px ${checkerSize / scale}px`,
          backgroundPosition: `0 0, 0 ${checkerSize / (2 * scale)}px, ${checkerSize / (2 * scale)}px -${checkerSize / (2 * scale)}px, -${checkerSize / (2 * scale)}px 0px`,
        }}
      >
        <Layer ref={layerRef}>
          <Rect
            name="background"
            width={config.width}
            height={config.height}
            fill="transparent" 
          />

          {elements.map((el) => {
            const { zIndex, type, fill, fillType, fillSecondary, ...elementProps } = el;

            void fill;
            void fillType;
            void fillSecondary;
            void zIndex;
            void type;

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
              onDragMove: onDragMove,


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

                const snapped = snapBox({
                  x: node.x(),
                  y: node.y(),
                  width: node.width(),
                  height: node.height(),
                });

                node.position({
                  x: snapped.x,
                  y: snapped.y,
                });

                node.width(snapped.width);
                node.height(snapped.height);

                dispatch(
                  updateElement({
                    id: el.id,
                    x: snapped.x,
                    y: snapped.y,
                    rotation: node.rotation(),
                    width: snapped.width,
                    height: snapped.height,
                    scaleX: 1,
                    scaleY: 1,
                  }),
                );
              },
            };

            if (el.isVisible === false) return null;

            if (el.type === "rect")
              return <Rect key={el.id} {...commonProps} {...getRectFillProps(el)}/>;

            // [UPDATED] Circle Adapter: Map Width to Radius to support resizing
            if (el.type === "circle")
              return (
                <Circle
                  key={el.id}
                  {...commonProps}
                  {...getCircleFillProps(el)}
                  // Konva Circle uses radius, not width/height.
                  // We map width to radius (assuming aspect ratio 1:1 or circle fits inside box)
                  radius={el.width / 2}
                  // Fix offset because Rect origin is top-left, Circle is center
                  offsetX={-el.width / 2}
                  offsetY={-el.height / 2}
                />
              );

            if (el.type === "text")
              return (
                <Text 
                  key={el.id} 
                  {...commonProps} 
                  verticalAlign="middle" 
                  // COMBINE WEIGHT AND STYLE HERE
                  fontStyle={`${el.fontStyle || 'normal'} ${el.fontWeight || 'normal'}`}
                />
              );

            if (el.type === "image") {
              return (
                <CanvasImage 
                key={el.id} 
                {...commonProps} 
                src={el.src}
                fill={el.fill}/>
              );
            }

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
              strokeWidth={1 / zoom} // MODIFIED: Use zoom from viewSlice
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
