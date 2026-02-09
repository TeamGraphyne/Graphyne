import { useEffect, useRef, useState } from "react";
import { socketService } from "../services/socket";

export function OutputPage() {
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Connect to Socket
    socketService.connect();

    // Listen for 'TAKE' (Load and Play new graphic)
    const handleTake = (data: { url: string }) => {
      console.log("📺 Output received TAKE:", data);
      setCurrentSrc(data.url);
    };

    // Listen for 'CLEAR' (Play Out animation)
    const handleClear = () => {
      console.log("📺 Output received CLEAR");
      iframeRef.current?.contentWindow?.postMessage("out", "*");
    };

    socketService.on("render:take", handleTake);
    socketService.on("render:clear", handleClear);

    return () => {
      socketService.off("render:take");
      socketService.disconnect();
    };
  }, []);

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