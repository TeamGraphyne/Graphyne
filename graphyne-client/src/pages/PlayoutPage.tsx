import { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  AlertCircle,
  RefreshCw,
  VectorSquare,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Camera,
} from "lucide-react";
import { api } from "../services/api";
import { socketService } from "../services/socket";
import type { PlaylistItem } from "../types/project";
import type { CanvasElement, CanvasConfig } from "../types/canvas";
import type { DataUpdatePayload, DataSourceData } from "../types/datasource";
import { resolveBindings, pushUpdatesToIframe } from "../services/dataResolver";
import { useNavigate } from "react-router-dom";

import transLogo from "../assets/TransLogo.png";

// Configuration
const SERVER_URL = `http://${window.location.hostname}:3001`;

// --- HELPER COMPONENT: Auto-Scaling Iframe ---
interface ScaledFrameProps {
  src: string;
  title: string;
  autoPlay?: boolean;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoad?: () => void;
  baseWidth?: number;
  baseHeight?: number;
}

const ScaledFrame = ({ src, title, autoPlay, iframeRef, onIframeLoad, baseWidth = 1920, baseHeight = 1080 }: ScaledFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const localIframeRef = useRef<HTMLIFrameElement>(null);
  const activeRef = iframeRef || localIframeRef;
  const [scale, setScale] = useState(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parentW = containerRef.current.offsetWidth;
        const parentH = containerRef.current.offsetHeight;
        
        const scaleW = parentW / baseWidth;
        const scaleH = parentH / baseHeight;
        
        // Scale to fit within both horizontal and vertical bounds
        setScale(Math.min(scaleW, scaleH));
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    if (onIframeLoad) {
      onIframeLoad();
    }
    if (autoPlay && activeRef.current?.contentWindow) {
      console.log(`📺 [Iframe] Auto-playing ${title}`);
      activeRef.current.contentWindow.postMessage('play', '*');
    }
  };

  if (hasError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400">
        <AlertCircle size={48} className="mb-3 opacity-50" />
        <div className="text-lg font-bold">{title}</div>
        <div className="text-xs mt-1">Graphic preview unavailable</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-black">
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: `${baseWidth}px`,
          height: `${baseHeight}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        <iframe
          ref={activeRef}
          src={src}
          title={title}
          onLoad={handleLoad}
          onError={() => setHasError(true)}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
};

// --- Helper: Parse rawJson from a PlaylistItem to get elements ---
function parseGraphicElements(item: PlaylistItem): CanvasElement[] {
  try {
    const parsed = JSON.parse(item.graphic.rawJson);
    return parsed.elements || [];
  } catch {
    console.warn('⚠️ Failed to parse rawJson for graphic:', item.graphic.name);
    return [];
  }
}

function parseGraphicConfig(item: PlaylistItem): CanvasConfig | null {
  try {
    const parsed = JSON.parse(item.graphic.rawJson);
    return parsed.config || null;
  } catch {
    return null;
  }
}

export function PlayoutPage() {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  
  const [previewItem, setPreviewItem] = useState<PlaylistItem | null>(null);
  const [previewElements, setPreviewElements] = useState<CanvasElement[]>([]);
  const [previewConfig, setPreviewConfig] = useState<CanvasConfig | null>(null);
  
  const [programItem, setProgramItem] = useState<PlaylistItem | null>(null);
  const [programElements, setProgramElements] = useState<CanvasElement[]>([]);
  const [programConfig, setProgramConfig] = useState<CanvasConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState<string>("Loading...");
  const navigate = useNavigate();

  // Refs and state for data binding
  const programIframeRef = useRef<HTMLIFrameElement>(null);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const [dataSources, setDataSources] = useState<DataSourceData[]>([]);
  const [liveData, setLiveData] = useState<Record<string, Record<string, unknown>>>({});

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Drag and drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // NEW: Ref for the import file input
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. System Startup ---
  useEffect(() => {
    socketService.connect();
    loadRundown();
    return () => {
      socketService.disconnect();
    };
  }, []);

  // --- Listen for data:update events ---
  useEffect(() => {
    const handleDataUpdate = (payload: DataUpdatePayload) => {
      setLiveData(prev => ({
        ...prev,
        [payload.sourceId]: payload.data
      }));

      if (programElements.length > 0) {
        const updates = resolveBindings(programElements, payload.sourceId, payload.data);
        pushUpdatesToIframe(programIframeRef.current, updates);
      }

      if (previewElements.length > 0) {
        const previewUpdates = resolveBindings(previewElements, payload.sourceId, payload.data);
        pushUpdatesToIframe(previewIframeRef.current, previewUpdates);
      }
    };

    socketService.on('data:update', handleDataUpdate);
    return () => {
      socketService.off('data:update');
    };
  }, [programElements, previewElements]);

  // --- Fetch data sources ---
  useEffect(() => {
    if (!activeProjectId) return;

    api.getDataSources(activeProjectId).then(sources => {
      setDataSources(sources);
      sources.forEach(source => {
        if (source.autoStart && source.pollingInterval > 0) {
          socketService.emit('data:start-polling', { sourceId: source.id });
        }
      });
    }).catch(err => console.error('Failed to load data sources:', err));
  }, [activeProjectId]);

  // --- Global Keyboard Shortcuts (CSV row navigation) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      const csvSources = dataSources.filter(s => s.type === 'csv-file');
      if (csvSources.length === 0) return;

      const targetSource = csvSources[0];
      const data = liveData[targetSource.id];
      if (!data) return;

      const currentRow = (data.__currentRow as number) ?? 0;
      const rowCount = (data.__rowCount as number) ?? 1;

      if (e.key === '[') {
        const nextRow = Math.max(0, currentRow - 1);
        socketService.emit('data:csv-row', { sourceId: targetSource.id, rowIndex: nextRow });
      } else if (e.key === ']') {
        const nextRow = Math.min(rowCount - 1, currentRow + 1);
        socketService.emit('data:csv-row', { sourceId: targetSource.id, rowIndex: nextRow });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dataSources, liveData]);

  const loadRundown = async () => {
    setIsLoading(true);
    try {
      const projects = await api.getProjects();
      if (projects.length > 0) {
        const activeProject = await api.getProjectById(projects[0].id);
        setProjectName(activeProject.name);
        setActiveProjectId(activeProject.id);

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

  const handleRemoveItem = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (!activeProjectId) return;

    // 1. Optimistic UI Update
    const updated = [...playlist];
    updated.splice(index, 1);
    setPlaylist(updated);

    // 2. Persist to Database
    try {
      const itemsToSave = updated.map((item, idx) => ({
        graphicId: item.graphicId,
        order: idx
      }));
      await api.updateProject(activeProjectId, projectName, itemsToSave);
    } catch (err) {
      console.error("Failed to remove item from database:", err);
      loadRundown(); // Rollback on failure
    }
  };

  // NEW: Import an external HTML graphic into the rundown
  const handleImportGraphic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const htmlContent = event.target?.result as string;
      try {
        const response = await api.saveGraphic({
          name: file.name,
          html: htmlContent,
          json: {}, // Generic placeholder for direct imports
          projectId: activeProjectId
        });
        if (response.data.success) {
          await loadRundown();
        }
      } catch (err) {
        console.error("Failed to persist imported graphic:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  // Drag and drop handlers (with DB persistence)
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (index: number) => setDragOverIndex(index);

  const handleDrop = async (index: number) => {
    if (dragIndex === null || dragIndex === index || !activeProjectId) return;

    // 1. Optimistic UI Update
    const updated = [...playlist];
    const [movedItem] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, movedItem);
    setPlaylist(updated);
    setDragIndex(null);
    setDragOverIndex(null);

    // 2. Persist to Database
    try {
      const itemsToSave = updated.map((item, idx) => ({
        graphicId: item.graphicId,
        order: idx
      }));
      await api.updateProject(activeProjectId, projectName, itemsToSave);
    } catch (err) {
      console.error("Failed to save reordered items:", err);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // --- 2. Transport Controls ---

  const getGraphicUrl = (filePath: string) => {
    const filename = filePath.split('/').pop();
    return `${SERVER_URL}/graphics/${filename}`;
  };

  const handleLoadToPreview = (item: PlaylistItem) => {
    setPreviewItem(item);
    setPreviewElements(parseGraphicElements(item));
    setPreviewConfig(parseGraphicConfig(item));
  };

  const handleTake = () => {
    if (previewItem && previewConfig) {
      const elements = previewElements; // Already parsed and set by handleLoadToPreview
      const fullUrl = getGraphicUrl(previewItem.graphic.filePath);

      if (programItem) {
        if (programIframeRef.current?.contentWindow) {
          programIframeRef.current.contentWindow.postMessage('out', '*');
        }

        socketService.emit("command:clear");

        setTimeout(() => {
          setProgramItem(previewItem);
          setProgramElements(elements);
          setProgramConfig(previewConfig); // Set program config
          console.log("🚀 Emitting TAKE:", fullUrl);
          socketService.emit("command:take", {
            url: fullUrl,
            elements: elements,
            config: previewConfig,
            liveData: liveData
          });
        }, 1500);
      } else {
        setProgramItem(previewItem);
        setProgramElements(elements);
        setProgramConfig(previewConfig); // Set program config
        console.log("🚀 Emitting TAKE:", fullUrl);
        socketService.emit("command:take", {
          url: fullUrl,
          elements: elements,
          config: previewConfig,
          liveData: liveData
        });
      }
    }
  };

  const handleClearProgram = () => {
    if (programIframeRef.current?.contentWindow) {
      programIframeRef.current.contentWindow.postMessage('out', '*');
    }

    console.log("🛑 Emitting CLEAR");
    socketService.emit("command:clear");

    setTimeout(() => {
      setProgramItem(null);
      setProgramElements([]);
      setProgramConfig(null); // Clear program config
    }, 1000);
  };

  const openOutputWindow = () => {
    window.open('/output', 'GraphyneOutput', 'width=1920,height=1080,menubar=no,toolbar=no');
  };

  // NEW: Capture the program iframe at 3x resolution as a PNG snapshot
  const handleSnapshot = () => {
    const iframe = programIframeRef.current;
    if (!iframe?.contentWindow) {
      console.warn('📸 No program graphic loaded to snapshot');
      return;
    }

    console.log('📸 Requesting 3× high-res snapshot from graphic...');

    // Listen for the snapshot result from the iframe
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'snapshot-result') return;
      window.removeEventListener('message', handler);

      if (event.data.error) {
        console.error('📸 Snapshot failed:', event.data.error);
        return;
      }

      // Trigger download
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `Graphyne_Snapshot_${timestamp}.png`;
      link.href = event.data.dataUrl;
      link.click();

      console.log('📸 Snapshot saved:', link.download);
    };

    window.addEventListener('message', handler);

    // Ask the iframe to capture itself
    iframe.contentWindow.postMessage({ type: 'snapshot', scale: 3 }, '*');
  };

  const applyAllCachedData = (
    iframeRef: React.RefObject<HTMLIFrameElement | null>,
    elements: CanvasElement[],
    currentLiveData: Record<string, Record<string, unknown>>
  ) => {
    if (!iframeRef.current || elements.length === 0) return;
    let appliedUpdates = 0;

    Object.entries(currentLiveData).forEach(([sourceId, data]) => {
      const updates = resolveBindings(elements, sourceId, data);
      if (updates.length > 0) {
        pushUpdatesToIframe(iframeRef.current, updates);
        appliedUpdates += updates.length;
      }
    });

    if (appliedUpdates > 0) {
      console.log(`⚡ [Pre-cache] Injected ${appliedUpdates} bindings before playback`);
    }
  };

  // --- 3. Render Helper ---
  const renderMonitorContent = (
    item: PlaylistItem | null,
    label: string,
    shouldAutoPlay: boolean,
    externalIframeRef: React.RefObject<HTMLIFrameElement | null>,
    elements: CanvasElement[],
    config: CanvasConfig | null
  ) => {
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
        iframeRef={externalIframeRef}
        onIframeLoad={() => {
          console.log(`✅ [${label}] Iframe loaded ${item.graphic.name}`);
          applyAllCachedData(externalIframeRef, elements, liveData);
        }}
        baseWidth={config?.width}
        baseHeight={config?.height}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#140a24] text-white overflow-hidden font-sans">
      {/* HEADER */}
      <header className="h-14 bg-[#1a0f2e] border-purple-900/40 flex flex-shrink-0 items-center px-6 justify-between shadow-md z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-4 justify-start">
            <img src={transLogo} alt="Graphyne Logo" className="w-8 h-8" />
            <span className="text-purple-400 font-light">PLAYOUT</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right mr-4">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              ACTIVE SHOW
            </div>
            <div className="text-sm font-bold text-gray-200">{projectName}</div>
          </div>

          {dataSources.length > 0 && (
            <div className="text-[10px] text-orange-400 font-bold px-2 py-1 bg-orange-950/30 border border-orange-900/30 rounded">
              📡 {dataSources.length} DATA SOURCE{dataSources.length !== 1 ? 'S' : ''}
            </div>
          )}

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
          <div className="flex-1 flex flex-col p-6 gap-6 max-w-7xl mx-auto w-full min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-6 w-full">

          {/* PREVIEW WINDOW */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end px-1">
              <span className="text-sm font-bold text-gray-400 tracking-wider">PREVIEW</span>
              <span className="text-xs text-purple-300 font-mono">
                {previewItem ? previewItem.graphic.name : "IDLE"}
              </span>
            </div>
            <div className="relative w-full aspect-video bg-[#20123a] border-purple-900/40 overflow-hidden shadow-inner">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(#a78bfa 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
              {renderMonitorContent(previewItem, "Preview", false, previewIframeRef, previewElements, previewConfig)}
              <div className="absolute top-4 left-4 px-2 py-0.5 bg-purple-600/90 text-white text-[10px] font-bold tracking-widest rounded shadow-sm">PVW</div>
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
              {renderMonitorContent(programItem, "Program", true, programIframeRef, programElements, programConfig)}
              <div className="absolute top-4 right-4 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold tracking-widest rounded shadow-sm">ON AIR</div>
            </div>
          </div>
        </div>

        {/* CONTROLS AREA */}
        <div className="flex justify-center items-center py-2 gap-8">

          {/* Main Transport */}
          <div className="flex gap-4 p-2 bg-[#1a0f2e] border-purple-900/40 shadow-xl rounded-lg">
            <button
              onClick={handleTake}
              disabled={!previewItem}
              className={`
                group relative overflow-hidden w-48 h-12 rounded-lg font-black tracking-[0.15em] transition-all duration-200
                flex items-center justify-center gap-2
                ${previewItem ? "bg-purple-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95" : "bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700"}
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

            {/* NEW: Snapshot button */}
            <button
              onClick={handleSnapshot}
              disabled={!programItem}
              className={`
                w-12 h-12 rounded-lg font-bold transition-all duration-200
                flex items-center justify-center
                ${programItem ? "border-2 border-purple-900/50 text-purple-400 hover:bg-purple-950 hover:border-purple-500 active:scale-95" : "border-2 border-gray-800 text-gray-700 cursor-not-allowed bg-gray-900"}
              `}
              title="Capture 3× High-Res Snapshot"
            >
              <Camera size={18} />
            </button>
          </div>

          {/* Data Source Controls (CSV Pagination) */}
          {dataSources.some(s => s.type === 'csv-file') && (
            <div className="flex gap-4 p-2 bg-[#1a0f2e] border-purple-900/40 shadow-xl rounded-lg">
              {dataSources.filter(s => s.type === 'csv-file').map(source => {
                const data = liveData[source.id] || {};
                const currentRow = (data.__currentRow as number) ?? 0;
                const rowCount = (data.__rowCount as number) ?? 0;

                return (
                  <div key={source.id} className="flex items-center gap-3 px-3 py-1 bg-[#20123a] border border-purple-900/40 rounded">
                    <span className="text-xs font-bold text-gray-300 min-w-[80px] truncate">📄 {source.name}</span>
                    <div className="flex items-center bg-gray-900 rounded border border-gray-700 overflow-hidden">
                      <button
                        onClick={() => socketService.emit('data:csv-row', { sourceId: source.id, rowIndex: Math.max(0, currentRow - 1) })}
                        className="px-2 py-1.5 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                        title="Previous Row (Shortcut: [ )"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-mono text-purple-300 min-w-[50px] text-center font-bold">
                        {rowCount > 0 ? currentRow + 1 : 0} <span className="text-gray-600">/</span> {rowCount}
                      </span>
                      <button
                        onClick={() => socketService.emit('data:csv-row', { sourceId: source.id, rowIndex: Math.min(rowCount - 1, currentRow + 1) })}
                        className="px-2 py-1.5 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                        title="Next Row (Shortcut: ] )"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RUNDOWN LIST */}
        <div className="flex-1 flex flex-col bg-[#1a0f2e] border-purple-900/40 overflow-hidden shadow-lg min-h-0">
          <div className="px-4 py-3 bg-[#20123a] border-purple-900/40 flex justify-between items-center">
            <h3 className="font-bold text-gray-300 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full" />
              RUNDOWN
            </h3>

            <div className="flex items-center gap-2">
              {/* NEW: Import button (from feature branch) */}
              <button
                onClick={() => importFileInputRef.current?.click()}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-xs font-bold text-white rounded transition-colors"
              >
                + IMPORT
              </button>
              <input
                ref={importFileInputRef}
                type="file"
                accept=".html"
                className="hidden"
                onChange={handleImportGraphic}
              />

              <button
                onClick={loadRundown}
                className="p-1.5 text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
                title="Refresh Rundown"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
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
                const isDragging = dragIndex === index;
                const isDragOver = dragOverIndex === index;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      handleDragOver(index);
                    }}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleLoadToPreview(item)}
                    className={`
                      group flex items-center px-4 py-3 rounded-lg cursor-pointer border transition-all duration-150 relative overflow-hidden
                      ${isDragging ? "opacity-50" : ""}
                      ${isDragOver ? "border-t-4 border-t-blue-500" : ""}
                      ${isProgram ? "bg-pink-950/30 border-pink-900/60 shadow-[inset_0_0_10px_rgba(220,38,38,0.1)]" : isPreview ? "bg-purple-900/30 border-purple-500 shadow-[inset_0_0_10px_rgba(37,99,235,0.1)]" : "bg-[#20123a] border-transparent hover:bg-gray-800 hover:border-gray-700"}
                    `}
                  >
                    {(isPreview || isProgram) && (<div className={`absolute left-0 top-0 bottom-0 w-1 ${isProgram ? "bg-red-500" : "bg-blue-500"}`} />)}
                    <div className="w-8 font-mono text-xs text-gray-600 text-center">{(index + 1).toString().padStart(2, "0")}</div>
                    <div className="w-8 flex justify-center mr-2">
                      {isProgram && (<div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]" />)}
                      {!isProgram && isPreview && (<div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />)}
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <span className={`text-sm font-bold truncate ${isProgram ? "text-red-400" : isPreview ? "text-purple-300" : "text-gray-200"}`}>{item.graphic.name}</span>
                      <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wide">HTML5 SOURCE</span>
                    </div>

                    <div className="w-24 flex items-center justify-end gap-3">
                      <span className={`text-[10px] font-black tracking-wider mr-2 ${isProgram ? "text-red-600" : isPreview ? "text-blue-600" : "hidden"}`}>{isProgram ? "ON AIR" : "NEXT"}</span>

                      <button
                        onClick={(e) => handleRemoveItem(e, index)}
                        className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove from Rundown"
                      >
                        <Trash2 size={16} />
                      </button>
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