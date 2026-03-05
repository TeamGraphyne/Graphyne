import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { ActionCreators } from "redux-undo";
import { addElement, zoomIn, zoomOut } from "../../store/canvasSlice";
import { addElement } from "../../store/canvasSlice"; // MODIFIED: Removed zoomIn, zoomOut
import { zoomIn, zoomOut } from "../../store/viewSlice"; // NEW: Import from viewSlice
import {
  Square,
  Circle,
  Type,
  Image as ImageIcon,
  Undo,
  Redo,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  ChevronDown,
} from "lucide-react";

export const Toolbar = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---------------- GRID SETTINGS ---------------- */
  const [showGridMenu, setShowGridMenu] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [snapStyle, setSnapStyle] = useState<"centers" | "edges">("centers");
  const [gridStyle, setGridStyle] = useState<"lines" | "graph">("lines");

  const snap = (value: number) =>
    snapEnabled ? Math.round(value / gridSize) * gridSize : value;
  /* ------------------------------------------------ */

  const defaultAnim = {
    type: "fade",
    duration: 0.5,
    delay: 0,
    ease: "power1.out",
  };

  const addRect = () => {
    dispatch(
      addElement({
        type: "rect",
        name: "Rectangle",
        x: snap(100),
        y: snap(100),
        width: 200,
        height: 100,
        fill: "#ffb86a",
        stroke: "#000000",
        strokeWidth: 0,
        opacity: 1,
        shadow: {
          color: "black",
          blur: 0,
          offsetX: 0,
          offsetY: 0,
        },
        isLocked: false,
        isVisible: true,
        inAnimation: { ...defaultAnim },
        outAnimation: { ...defaultAnim },
      }),
    );
  };

  const addCircle = () => {
    dispatch(
      addElement({
        type: "circle",
        name: "Circle",
        x: snap(150),
        y: snap(150),
        width: 100,
        height: 100,
        fill: "#721378",
        stroke: "#000000",
        strokeWidth: 0,
        opacity: 1,
        isLocked: false,
        isVisible: true,
        inAnimation: { ...defaultAnim },
        outAnimation: { ...defaultAnim },
      }),
    );
  };

  const addText = () => {
    dispatch(
      addElement({
        type: "text",
        name: "Text Layer",
        x: snap(200),
        y: snap(200),
        text: "Double click to edit",
        fontSize: 24,
        fontFamily: "Arial",
        fill: "#000000",
        width: 200,
        height: 40,
        opacity: 1,
        isLocked: false,
        isVisible: true,
        inAnimation: { ...defaultAnim },
        outAnimation: { ...defaultAnim },
      }),
    );
  };

  const handleZoomIn = () => dispatch(zoomIn());
  const handleZoomOut = () => dispatch(zoomOut());

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      const maxSize = 500;
      const scale = Math.min(1, maxSize / img.width, maxSize / img.height);

      dispatch(
        addElement({
          type: "image",
          name: file.name,
          x: snap(100),
          y: snap(100),
          width: img.width * scale,
          height: img.height * scale,
          src: objectUrl,
          opacity: 1,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          isLocked: false,
          isVisible: true,
          inAnimation: { ...defaultAnim },
          outAnimation: { ...defaultAnim },
          fill: "transparent",
        }),
      );
    };

    img.src = objectUrl;
    e.target.value = "";
  };

  return (
    <div className="relative h-14 bg-fuchsia-950 flex items-center px-4 space-x-4 text-gray-300">

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/png, image/jpeg, image/svg+xml"
        className="hidden"
      />

      {/* Shape Tools */}
      <div className="flex space-x-2 border-r pr-4">
        <button onClick={addRect} className="p-2 hover:bg-orange-300 rounded">
          <Square size={20} />
        </button>
        <button onClick={addCircle} className="p-2 hover:bg-orange-300 rounded">
          <Circle size={20} />
        </button>
        <button onClick={addText} className="p-2 hover:bg-orange-300 rounded">
          <Type size={20} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-orange-300 rounded"
        >
          <ImageIcon size={20} />
        </button>
      </div>

      {/* GRID DROPDOWN */}
      <div className="relative border-r pr-4">
        <button
          onClick={() => setShowGridMenu(!showGridMenu)}
          className="flex items-center gap-2 p-2 hover:bg-orange-300 rounded"
        >
          <Grid3X3 size={20} />
          <ChevronDown size={14} />
        </button>

        {showGridMenu && (
          <div className="absolute top-12 left-0 w-56 bg-fuchsia-950 border border-indigo-800 shadow-lg rounded text-sm p-2 space-y-2 z-50">
            
            <label className="flex items-center justify-between cursor-pointer">
              <span>Show Grid</span>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={() => setShowGrid(!showGrid)}
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span>Snap To Grid</span>
              <input
                type="checkbox"
                checked={snapEnabled}
                onChange={() => setSnapEnabled(!snapEnabled)}
              />
            </label>

            <div className="flex items-center justify-between">
              <span>Grid Size</span>
              <input
                type="number"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-16 bg-indigo-900 rounded px-1"
              />
            </div>

            <div>
              <span className="block mb-1">Snap Style</span>
              <select
                value={snapStyle}
                onChange={(e) =>
                  setSnapStyle(e.target.value as "centers" | "edges")
                }
                className="w-full bg-indigo-900 rounded px-2 py-1"
              >
                <option value="centers">Centers</option>
                <option value="edges">Edges</option>
              </select>
            </div>

            <div>
              <span className="block mb-1">Style</span>
              <select
                value={gridStyle}
                onChange={(e) =>
                  setGridStyle(e.target.value as "lines" | "graph")
                }
                className="w-full bg-indigo-900 rounded px-2 py-1"
              >
                <option value="lines">Lines</option>
                <option value="graph">Graph Paper</option>
              </select>
            </div>

          </div>
        )}
      </div>

      {/* History Controls */}
      <div className="flex space-x-2">
        <button onClick={() => dispatch(ActionCreators.undo())} className="p-2 hover:bg-orange-300 rounded">
          <Undo size={20} />
        </button>
        <button onClick={() => dispatch(ActionCreators.redo())} className="p-2 hover:bg-orange-300 rounded">
          <Redo size={20} />
        </button>
        <button onClick={handleZoomIn} className="p-2 hover:bg-orange-300 rounded">
          <ZoomIn size={20} />
        </button>
        <button onClick={handleZoomOut} className="p-2 hover:bg-orange-300 rounded">
          <ZoomOut size={20} />
        </button>
        <button className="p-2 hover:bg-orange-300 rounded">
          <MousePointer2 size={20} />
        </button>
      </div>
    </div>
  );
};