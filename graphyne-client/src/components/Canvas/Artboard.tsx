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
import { CanvasImage } from "./CanvasImage";

export const Artboard = () => {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  const { elements, selectedIds, config, grid } = useAppSelector(
    (state) => state.canvas.present || state.canvas,
  );

  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    isSelecting: boolean;
  } | null>(null);

  // =========================
  // 🔥 SNAP FUNCTION
  // =========================
  const snapPosition = (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    if (!grid.snap) return { x, y };

    const size = grid.size;

    if (grid.snapStyle === "centers") {
      return {
        x: Math.round(x / size) * size,
        y: Math.round(y / size) * size,
      };
    }

    // edges snap
    return {
      x:
        Math.round((x + width / 2) / size) * size - width / 2,
      y:
        Math.round((y + height / 2) / size) * size - height / 2,
    };
  };

  // =========================
  // AUTO FIT
  // =========================
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const padding = 40;

      const availableWidth = container.clientWidth - padding;
      const availableHeight = container.clientHeight - padding;

      const scaleX = availableWidth / config.width;
      const scaleY = availableHeight / config.height;

      const initialZoom = Math.min(scaleX, scaleY, 1);
      dispatch(setZoom(initialZoom));
    }
  }, [config.width, config.height, dispatch]);

  // =========================
  // TRANSFORMER SYNC
  // =========================
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

  // =========================
  // DRAG HANDLERS WITH SNAP
  // =========================
  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const snapped = snapPosition(
      node.x(),
      node.y(),
      node.width(),
      node.height()
    );

    node.position(snapped);
  };

  const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const id = node.id();

    const snapped = snapPosition(
      node.x(),
      node.y(),
      node.width(),
      node.height()
    );

    dispatch(
      updateElement({
        id,
        x: snapped.x,
        y: snapped.y,
      }),
    );
  };

  // =========================
  // KEYBOARD DELETE
  // =========================
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

  // =========================
  // GRID VISUAL
  // =========================
  const renderGrid = () => {
    if (!grid.show) return null;

    const lines = [];
    const size = grid.size;

    for (let i = 0; i < config.width; i += size) {
      lines.push(
        <Rect
          key={"v" + i}
          x={i}
          y={0}
          width={1}
          height={config.height}
          fill="rgba(0,0,0,0.08)"
          listening={false}
        />
      );
    }

    for (let j = 0; j < config.height; j += size) {
      lines.push(
        <Rect
          key={"h" + j}
          x={0}
          y={j}
          width={config.width}
          height={1}
          fill="rgba(0,0,0,0.08)"
          listening={false}
        />
      );
    }

    return lines;
  };

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
      >
        <Layer ref={layerRef}>
          <Rect
            name="background"
            width={config.width}
            height={config.height}
            fill="white"
          />

          {renderGrid()}

          {elements.map((el) => {
            const { zIndex, type, ...elementProps } = el;

            const commonProps = {
              ...elementProps,
              draggable: !el.isLocked,
              onClick: () => dispatch(selectElement(el.id)),
              onDragMove,
              onDragEnd,
            };

            if (!el.isVisible) return null;

            if (el.type === "rect")
              return <Rect key={el.id} {...commonProps} />;

            if (el.type === "circle")
              return (
                <Circle
                  key={el.id}
                  {...commonProps}
                  radius={el.width / 2}
                />
              );

            if (el.type === "text")
              return <Text key={el.id} {...commonProps} />;

            if (el.type === "image")
              return (
                <CanvasImage
                  key={el.id}
                  {...commonProps}
                  src={el.src}
                />
              );

            return null;
          })}

          <Transformer ref={trRef} />
        </Layer>
      </Stage>
    </div>
  );
};
