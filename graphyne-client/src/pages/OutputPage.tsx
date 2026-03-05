import { useEffect, useRef, useState } from "react";
import { socketService } from "../services/socket";
import type { CanvasElement } from "../types/canvas";
import type { DataUpdatePayload } from "../types/datasource";
import { resolveBindings, pushUpdatesToIframe } from "../services/dataResolver";

export function OutputPage() {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // NEW: Cache the current graphic's elements for data binding resolution
  const [currentElements, setCurrentElements] = useState<CanvasElement[]>([]);

  useEffect(() => {
    // Connect to Socket
    socketService.connect();

    // Listen for 'TAKE' (Load and Play new graphic)
    // MODIFIED: Payload now includes elements for binding resolution
    const handleTake = (data: { url: string; elements?: CanvasElement[] }) => {
      console.log("📺 Output received TAKE:", data.url);
      setCurrentSrc(data.url);

      // Cache elements for data binding (if provided by PlayoutPage)
      if (data.elements) {
        setCurrentElements(data.elements);
      } else {
        setCurrentElements([]);
      }
    };

    // Listen for 'CLEAR' (Play Out animation)
    const handleClear = () => {
      console.log("📺 Output received CLEAR");
      iframeRef.current?.contentWindow?.postMessage("out", "*");
      // Don't clear currentElements immediately — the out animation may still be playing.
      // Clear after a delay, or just let the next TAKE overwrite them.
    };

    socketService.on("render:take", handleTake);
    socketService.on("render:clear", handleClear);

    return () => {
      socketService.off("render:take");
      socketService.off("render:clear");
      socketService.off("data:update");
      socketService.disconnect();
    };
  }, []);

  // NEW: Separate effect for data:update so it always has the latest currentElements
  useEffect(() => {
    const handleDataUpdate = (payload: DataUpdatePayload) => {
      if (currentElements.length === 0) return;

      const updates = resolveBindings(currentElements, payload.sourceId, payload.data);
      pushUpdatesToIframe(iframeRef.current, updates);
    };

    socketService.on("data:update", handleDataUpdate);
    return () => {
      socketService.off("data:update");
    };
  }, [currentElements]);

  // Auto-Play Logic
  const handleLoad = () => {
    if (currentSrc && iframeRef.current?.contentWindow) {
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage("play", "*");
      }, 50);
    }
  };

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      {currentSrc && (
        <iframe
          ref={iframeRef}
          src={currentSrc}
          onLoad={handleLoad}
          className="w-full h-full border-0"
          title="Broadcast Output"
          sandbox="allow-scripts allow-same-origin"
        />
      )}
    </div>
  );
}