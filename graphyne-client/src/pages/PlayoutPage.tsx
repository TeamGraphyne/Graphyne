import { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  MonitorPlay,
  AlertCircle,
  RefreshCw,
  VectorSquare,
  ExternalLink
} from "lucide-react";
import { api } from "../services/api";
import { socketService } from "../services/socket";
import type { PlaylistItem } from "../types/project";
import { useNavigate } from "react-router-dom";

// Configuration
const SERVER_URL = "http://localhost:3001";

// --- HELPER COMPONENT: Auto-Scaling Iframe ---
interface ScaledFrameProps {
  src: string;
  title: string;
  autoPlay?: boolean;
}

const ScaledFrame = ({ src, title, autoPlay }: ScaledFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);

  // 1. Handle Scaling
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const currentWidth = containerRef.current.offsetWidth;
        setScale(currentWidth / 1920);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Handle Auto-Play Logic
  const handleLoad = () => {
    if (autoPlay && iframeRef.current?.contentWindow) {
      console.log(`▶️ Auto-playing ${title}`);
      iframeRef.current.contentWindow.postMessage('play', '*');
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-black"
    >
      <div
        style={{
          width: "1920px",
          height: "1080px",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        className="absolute top-0 left-0"
      >
        <iframe
          ref={iframeRef}
          src={src}
          title={title}
          onLoad={handleLoad}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
};

export function PlayoutPage() {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [previewItem, setPreviewItem] = useState<PlaylistItem | null>(null);
  const [programItem, setProgramItem] = useState<PlaylistItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState<string>("Loading...");
  const navigate = useNavigate();

  // --- 1. System Startup ---
  useEffect(() => {
    socketService.connect();
    loadRundown();
    return () => {
      socketService.disconnect();
    };
  }, []);

  const loadRundown = async () => {
    setIsLoading(true);
    try {
      const projects = await api.getProjects();
      if (projects.length > 0) {
        // [FIXED] Use getProjectById to get items
        const activeProject = await api.getProjectById(projects[0].id);
        setProjectName(activeProject.name);
        
        // Sort items by order
        const items = activeProject.items || [];
        const sorted = items.sort((a: PlaylistItem, b: PlaylistItem) => a.order - b.order);
        setPlaylist(sorted);
      } else {
        setProjectName("No Projects Found");
      }
    } catch (err) {
      console.error("❌ Failed to load rundown:", err);
      setProjectName("Connection Error");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. Transport Controls ---

  // Helper to generate correct URL
  const getGraphicUrl = (filePath: string) => {
    // Assuming filePath is something like "/graphics/uuid.html"
    // We append SERVER_URL if it's a relative path, or ensure it's correct
    const filename = filePath.split('/').pop();
    return `${SERVER_URL}/graphics/${filename}`;
  };

  const handleLoadToPreview = (item: PlaylistItem) => {
    setPreviewItem(item);
  };

  const handleTake = () => {
    if (previewItem) {
      // 1. Move Preview to Program
      setProgramItem(previewItem);
      
      const fullUrl = getGraphicUrl(previewItem.graphic.filePath);

      // 2. Emit Socket command for external renderers (Output Window)
      console.log("🚀 Emitting TAKE:", fullUrl);
      socketService.emit("command:take", {
        url: fullUrl // Using simple 'url' payload to match OutputPage expectation
      });
    }
  };

  const handleClearProgram = () => {
    setProgramItem(null);
    console.log("🛑 Emitting CLEAR");
    socketService.emit("command:clear");
  };

  const openOutputWindow = () => {
    window.open('/output', 'GraphyneOutput', 'width=1920,height=1080,menubar=no,toolbar=no');
  };

  // --- 3. Render Helper ---
  const renderMonitorContent = (item: PlaylistItem | null, label: string, shouldAutoPlay: boolean) => {
    if (!item) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
          <Square size={48} className="mb-2 opacity-50" />
          <span className="text-sm font-medium">NO SOURCE</span>
        </div>
      );
    }

    return (
      <ScaledFrame 
        src={getGraphicUrl(item.graphic.filePath)} 
        title={label} 
        autoPlay={shouldAutoPlay}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden font-sans">
      {/* HEADER */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 justify-between shadow-md z-10">
        <div className="flex items-center gap-2">
          <MonitorPlay className="text-blue-500" size={24} />
          <h1 className="font-bold text-xl tracking-tight text-gray-100">
            Graphyne <span className="text-blue-500 font-light">PLAYOUT</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right mr-4">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              ACTIVE SHOW
            </div>
            <div className="text-sm font-bold text-gray-200">{projectName}</div>
          </div>

          {/* NEW: Open Output Button */}
          <button 
             onClick={openOutputWindow}
             className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded text-blue-400 border border-blue-900/30 hover:border-blue-500 transition-colors"
           >
             <ExternalLink size={14} /> OUTPUT
           </button>

          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded text-gray-300 border border-gray-700"
            onClick={() => navigate("/editor")}
          >
            <VectorSquare size={14} /> EDITOR
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col p-6 gap-6 max-w-[1920px] mx-auto w-full">
        <div className="grid grid-cols-2 gap-6 w-full">
          
          {/* PREVIEW WINDOW */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end px-1">
              <span className="text-sm font-bold text-gray-400 tracking-wider">PREVIEW</span>
              <span className="text-xs text-blue-400 font-mono">
                {previewItem ? previewItem.graphic.name : "IDLE"}
              </span>
            </div>
            <div className="relative w-full aspect-video bg-gray-900 rounded-lg border-2 border-gray-700 overflow-hidden shadow-inner">
               {/* Checkerboard */}
               <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(#6b7280 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
               
               {renderMonitorContent(previewItem, "Preview", true)} 

               <div className="absolute top-4 left-4 px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-bold tracking-widest rounded shadow-sm">PVW</div>
            </div>
          </div>

          {/* PROGRAM WINDOW */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end px-1">
              <span className="text-sm font-bold text-red-500 tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                PROGRAM
              </span>
              <span className="text-xs text-red-400 font-mono">
                {programItem ? programItem.graphic.name : "BLACK"}
              </span>
            </div>
            <div className="relative w-full aspect-video bg-black rounded-lg border-2 border-red-900 overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.15)]">
              
              {renderMonitorContent(programItem, "Program", true)}

              <div className="absolute top-4 right-4 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold tracking-widest rounded shadow-sm">ON AIR</div>
            </div>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex justify-center items-center py-2">
          <div className="flex gap-4 p-2 bg-gray-900 rounded-xl border border-gray-800 shadow-xl">
            <button
              onClick={handleTake}
              disabled={!previewItem}
              className={`
                group relative overflow-hidden w-48 h-12 rounded-lg font-black tracking-[0.15em] transition-all duration-200
                flex items-center justify-center gap-2
                ${previewItem ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95" : "bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700"}
              `}
            >
              <Play size={18} className={previewItem ? "fill-current" : ""} />
              TAKE
            </button>

            <button
              onClick={handleClearProgram}
              disabled={!programItem}
              className={`
                w-32 h-12 rounded-lg font-bold tracking-widest border-2 transition-all duration-200
                flex items-center justify-center gap-2
                ${programItem ? "border-red-900/50 text-red-500 hover:bg-red-950 hover:border-red-600 active:scale-95" : "border-gray-800 text-gray-700 cursor-not-allowed bg-gray-900"}
              `}
            >
              <Square size={16} className={programItem ? "fill-current" : ""} />
              CLEAR
            </button>
          </div>
        </div>

        {/* RUNDOWN LIST */}
        <div className="flex-1 flex flex-col bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg min-h-0">
          <div className="px-4 py-3 bg-gray-850 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-gray-300 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full" />
              RUNDOWN
            </h3>
            <button onClick={loadRundown} className="p-1.5 text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors" title="Refresh Rundown">
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {playlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                <AlertCircle size={32} className="opacity-20" />
                <p className="text-sm">Rundown is empty or could not be loaded.</p>
              </div>
            ) : (
              playlist.map((item, index) => {
                const isPreview = previewItem?.id === item.id;
                const isProgram = programItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleLoadToPreview(item)}
                    className={`
                      group flex items-center px-4 py-3 rounded-lg cursor-pointer border transition-all duration-150 relative overflow-hidden
                      ${isProgram ? "bg-red-950/30 border-red-900/60 shadow-[inset_0_0_10px_rgba(220,38,38,0.1)]" : isPreview ? "bg-blue-950/30 border-blue-600/50 shadow-[inset_0_0_10px_rgba(37,99,235,0.1)]" : "bg-gray-800/40 border-transparent hover:bg-gray-800 hover:border-gray-700"}
                    `}
                  >
                    {(isPreview || isProgram) && (<div className={`absolute left-0 top-0 bottom-0 w-1 ${isProgram ? "bg-red-500" : "bg-blue-500"}`} />)}
                    <div className="w-8 font-mono text-xs text-gray-600 text-center">{(index + 1).toString().padStart(2, "0")}</div>
                    <div className="w-8 flex justify-center mr-2">
                      {isProgram && (<div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]" />)}
                      {!isProgram && isPreview && (<div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />)}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <span className={`text-sm font-bold truncate ${isProgram ? "text-red-400" : isPreview ? "text-blue-400" : "text-gray-200"}`}>{item.graphic.name}</span>
                      <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wide">HTML5 SOURCE</span>
                    </div>
                    <div className="w-20 text-right">
                      <span className={`text-[10px] font-black tracking-wider ${isProgram ? "text-red-600" : isPreview ? "text-blue-600" : "hidden"}`}>{isProgram ? "ON AIR" : "NEXT"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}