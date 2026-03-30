import { useEffect, useRef, useState } from "react";
import { socketService } from "../services/socket";
import type { CanvasElement } from "../types/canvas";
import type { DataUpdatePayload } from "../types/datasource";
import { resolveBindings, pushUpdatesToIframe } from "../services/dataResolver";

export function OutputPage() {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  // Key incremented on every TAKE forces React to remount the iframe even
  // when the URL hasn't changed.
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentElements, setCurrentElements] = useState<CanvasElement[]>([]);

  // Refs survive re-renders without triggering them – used to avoid stale closures
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set synchronously in the take handler so handleLoad always reads current intent
  const shouldPlayRef = useRef(false);

  useEffect(() => {
    socketService.connect();

    const handleTake = (data: { url: string; elements?: CanvasElement[] }) => {
      console.log("📺 Output received TAKE:", data.url);

      // Cancel any pending post-clear null-out so it does not wipe the new src
      if (clearTimerRef.current !== null) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }

      shouldPlayRef.current = true;
      // Always bump the key – forces a fresh iframe mount even for the same URL
      setIframeKey(k => k + 1);
      setCurrentSrc(data.url);
      setCurrentElements(data.elements ?? []);
    };

    const handleClear = () => {
      console.log("📺 Output received CLEAR");
      shouldPlayRef.current = false;
      iframeRef.current?.contentWindow?.postMessage("out", "*");

      // After the out-animation completes, remove the iframe entirely so the
      // next TAKE always starts from a blank slate.
      clearTimerRef.current = setTimeout(() => {
        setCurrentSrc(null);
        setCurrentElements([]);
        clearTimerRef.current = null;
      }, 1000);
    };

    // Pass the exact callback references so cleanup removes only these listeners
    socketService.on("render:take", handleTake);
    socketService.on("render:clear", handleClear);

    return () => {
      if (clearTimerRef.current !== null) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      socketService.off("render:take", handleTake);
      socketService.off("render:clear", handleClear);
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleDataUpdate = (payload: DataUpdatePayload) => {
      if (currentElements.length === 0) return;
      const updates = resolveBindings(currentElements, payload.sourceId, payload.data);
      pushUpdatesToIframe(iframeRef.current, updates);
    };

    socketService.on("data:update", handleDataUpdate);
    return () => {
      socketService.off("data:update", handleDataUpdate);
    };
  }, [currentElements]);

  // Fires whenever the iframe finishes loading. Reads shouldPlayRef (a ref, not
  // state) to avoid the stale-closure problem with currentSrc.
  const handleLoad = () => {
    if (!shouldPlayRef.current) return;
    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage("play", "*");
    }, 50);
  };

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      {currentSrc && (
        <iframe
          key={iframeKey}
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