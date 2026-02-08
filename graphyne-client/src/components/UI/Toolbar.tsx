import { useRef } from "react";
import { useDispatch } from "react-redux";
import { ActionCreators } from "redux-undo";
import { addElement, zoomIn, zoomOut } from "../../store/canvasSlice"; // Import the actions
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
} from "lucide-react";

export const Toolbar = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        x: 100,
        y: 100,
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
        x: 150,
        y: 150,
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
        x: 200,
        y: 200,
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
      dispatch(
        addElement({
          type: "image",
          name: file.name,
          x: 100,
          y: 100,
          width: img.width > 500 ? 500 : img.width, // Cap initial size
          height:
            img.height > 500 ? (500 * img.height) / img.width : img.height,
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
        style={{ display: "none" }}
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
