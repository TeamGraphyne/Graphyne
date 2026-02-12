import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { useFullscreen } from "../utils/useFullScreen";
import { PreviewCanvas } from "../components/Canvas/PreviewCanvas";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Maximize2,
  Minimize2
} from "lucide-react";

export function PreviewPage() {
  const navigate = useNavigate();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // 2. Initialize the hook using your ref
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(canvasContainerRef);

  // ... (the rest of your component remains the same)

  return (
    <div className="flex-1 relative bg-gray-800 flex items-center justify-center p-8">
      {/* ... canvas code ... */}
      
      <button
        // 3. Use the functions exactly where you need them
        onClick={isFullscreen ? exitFullscreen : enterFullscreen}
        className="absolute bottom-6 right-6 ..."
      >
        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
      </button>
    </div>
  );
}