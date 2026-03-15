import { useRef, useState } from "react";
import { ActionCreators } from "redux-undo";
import { zoomIn, zoomOut } from "../../store/viewSlice"; // NEW: Import from viewSlice
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  addElement,
  setShowGrid,
  setShowAlignmentGuides,
  setSnap,
  setGridStyle
} from "../../store/canvasSlice";
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
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CONNECT TO REDUX GRID STATE ---
  const grid = useAppSelector((state) => (state.canvas.present || state.canvas).grid);
  const [showGridMenu, setShowGridMenu] = useState(false);  

  // Hardcode snap size to 20 for newly added elements
  const snap = (value: number) =>
    grid.snap ? Math.round(value / 20) * 20 : value;
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

  const selectTool = () => {
    console.log("Select tool activated");
  };

  // Dispatch the actual Redux actions
  const handleZoomIn = () => {
    dispatch(zoomIn());
  };

  const handleZoomOut = () => {
    dispatch(zoomOut());
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Create temporary Blob URL
    const objectUrl = URL.createObjectURL(file);

    // 2. Load image to get natural dimensions
    const img = new window.Image();
    img.onload = () => {
      const maxSize = 500;
      const scale = Math.min(1, maxSize / img.width, maxSize / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      dispatch(
        addElement({
          type: "image",
          name: file.name,
          x: snap(100),
          y: snap(100),
          width: scaledWidth, // Cap initial size while preserving aspect ratio
          height: scaledHeight,
          src: objectUrl, // Store blob URL in Redux
          opacity: 1,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          isLocked: false,
          isVisible: true,
          inAnimation: { ...defaultAnim },
          outAnimation: { ...defaultAnim },
          fill: "transparent", // Images don't have a fill, but we need to set it for the type
        }),
      );
    };
    img.src = objectUrl;

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="h-14 bg-fuchsia-950 border-b border-none flex items-center px-4 space-x-4 text-gray-300">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/png, image/jpeg, image/svg+xml"
        className="hidden"
      />
      {/* Shape Tools */}
      <div className="flex space-x-2   border-r border-none pr-4">
        <button
          onClick={addRect}
          className="group/button p-2 hover:bg-orange-300 rounded transition-colors"
          title="Add Rectangle"
        >
          <Square size={20} className="group-hover/button:text-gray-800" />
        </button>
        <button
          onClick={addCircle}
          className="group/button p-2 hover:bg-orange-300 rounded transition-colors"
          title="Add Circle"
        >
          <Circle size={20} className="group-hover/button:text-gray-800" />
        </button>
        <button
          onClick={addText}
          className="group/button p-2 hover:bg-orange-300 rounded transition-colors"
          title="Add Text"
        >
          <Type size={20} className="group-hover/button:text-gray-800" />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group/button p-2 hover:bg-orange-300 rounded transition-colors"
          title="Add Image"
        >
          <ImageIcon size={20} className="group-hover/button:text-gray-800" />
        </button>
      </div>
      
      {/* GRID DROPDOWN */}
      <div className="relative border-r pr-4">
        <button
          onClick={() => setShowGridMenu(!showGridMenu)}
          className={`flex items-center gap-2 p-2 hover:bg-orange-300 rounded ${showGridMenu ? 'bg-orange-300 text-fuchsia-950' : ''}`}
        >
          <Grid3X3 size={20} />
          <ChevronDown size={14} />
        </button>

        {showGridMenu && (
          <div className="absolute top-12 left-0 w-56 bg-fuchsia-950 border border-indigo-800 shadow-lg rounded text-sm p-3 space-y-3 z-50">
            
            <label className="flex items-center justify-between cursor-pointer hover:text-white">
              <span>Show Background Grid</span>
              <input
                type="checkbox"
                checked={grid.show}
                onChange={() => dispatch(setShowGrid(!grid.show))}
                className="accent-orange-400 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-white">
              <span>Snap To Grid</span>
              <input
                type="checkbox"
                checked={grid.snap}
                onChange={() => dispatch(setSnap(!grid.snap))}
                className="accent-orange-400 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer hover:text-white">
              <span>Show Alignment Guides</span>
              <input
                type="checkbox"
                checked={grid.showAlignmentGuides}
                onChange={() => dispatch(setShowAlignmentGuides(!grid.showAlignmentGuides))}
                className="accent-orange-400 w-4 h-4 cursor-pointer"
              />
            </label>

            <div className="pt-1">
              <span className="block mb-1 text-gray-400 text-xs uppercase">Grid Style</span>
              <select
                value={grid.style}
                onChange={(e) => dispatch(setGridStyle(e.target.value as "lines" | "dots" | "graph"))}
                className="w-full bg-indigo-900 rounded px-2 py-1.5 outline-none cursor-pointer"
              >
                <option value="lines">Lines</option>
                <option value="dots">Dots</option>
                <option value="graph">Graph Paper</option>
              </select>
            </div>

          </div>
        )}
      </div>

      {/* History Controls */}
      <div className="flex space-x-2">
        <button
          onClick={() => dispatch(ActionCreators.undo())}
          className="group/button p-2 hover:bg-orange-300 rounded transition-colors"
          title="Undo"
        >
          <Undo size={20} className="group-hover/button:text-gray-800" />
        </button>
        <button
          onClick={() => dispatch(ActionCreators.redo())}
          className="group/button p-2 hover:bg-orange-300 rounded transition-colors"
          title="Redo"
        >
          <Redo size={20} className="group-hover/button:text-gray-800" />
        </button>
        <button
          onClick={handleZoomIn}
          className="group/button p-2 hover:bg-orange-300 rounded"
          title="Zoom In"
        >
          <ZoomIn size={20} className="group-hover/button:text-gray-800" />
        </button>
        <button
          onClick={handleZoomOut}
          className="group/button p-2 hover:bg-orange-300 rounded"
          title="Zoom Out"
        >
          <ZoomOut size={20} className="group-hover/button:text-gray-800" />
        </button>
        <button
          onClick={selectTool}
          className="group/button p-2 hover:bg-orange-300 rounded"
          title="Select Tool"
        >
          <MousePointer2
            size={20}
            className="group-hover/button:text-gray-800"
          />
        </button>
      </div>
    </div>
  );
};