import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
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
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 });
  
  // Get graphic name from Redux meta
  const { meta } = useAppSelector(
    (state) => state.canvas.present || state.canvas
  );

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        const container = canvasContainerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const aspectRatio = 16 / 9;
        let width = containerWidth;
        let height = width / aspectRatio;
        
        if (height > containerHeight) {
          height = containerHeight;
          width = height * aspectRatio;
        }
        
        setCanvasSize({ width, height });
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [isFullscreen]);
  

}