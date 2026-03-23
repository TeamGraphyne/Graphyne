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
  Copy,
  Check,
  X,
  Menu,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "../services/api";
import { socketService } from "../services/socket";
import type { PlaylistItem } from "../types/project";
import type { CanvasElement } from "../types/canvas";
import type { DataUpdatePayload, DataSourceData } from "../types/datasource";
import { resolveBindings, pushUpdatesToIframe } from "../services/dataResolver";
import { useNavigate } from "react-router-dom";

import transLogo from "../assets/TransLogo.png";

const SERVER_URL = `http://${window.location.hostname}:3001`;
const OUTPUT_URL  = `${SERVER_URL}/output`;

interface ScaledFrameProps {
  src: string;
  title: string;
  autoPlay?: boolean;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  onIframeLoad?: () => void;
}

const ScaledFrame = ({ src, title, autoPlay, iframeRef, onIframeLoad }: ScaledFrameProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const localIframeRef = useRef<HTMLIFrameElement>(null);
  const activeRef = iframeRef || localIframeRef;
  const [scale, setScale] = useState(1);
  const [hasError, setHasError] = useState(false);

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

  const handleLoad = () => {
    if (onIframeLoad) onIframeLoad();
    if (autoPlay && activeRef.current?.contentWindow) {
      activeRef.current.contentWindow.postMessage('play', '*');
    }
  };

  if (hasError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400">
        <AlertCircle size={32} className="mb-2 opacity-50" />
        <div className="text-sm font-bold">{title}</div>
        <div className="text-xs mt-1">Graphic preview unavailable</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-black">
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

function parseGraphicElements(item: PlaylistItem): CanvasElement[] {
  try {
    const parsed = JSON.parse(item.graphic.rawJson);
    return parsed.elements || [];
  } catch {
    console.warn('⚠️ Failed to parse rawJson for graphic:', item.graphic.name);
    return [];
  }
}

interface OutputDialogProps {
  onClose: () => void;
}

function OutputUrlDialog({ onClose }: OutputDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(OUTPUT_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = OUTPUT_URL;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:w-auto sm:min-w-96 sm:max-w-lg bg-neutral-900 border border-neutral-700 rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 bg-neutral-950 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <ExternalLink size={15} className="text-blue-400" />
            <span className="text-sm font-bold text-white">Broadcast Output</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          <p className="text-sm text-neutral-300 leading-relaxed">
            Open this URL in your browser or add it as a{" "}
            <span className="text-blue-300 font-semibold">Browser Source</span> in OBS.
          </p>

          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2">
            <span className="flex-1 text-xs sm:text-sm font-mono text-blue-300 truncate select-all">
              {OUTPUT_URL}
            </span>
            <button
              onClick={handleCopy}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded text-xs font-bold transition-all ${
                copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="bg-neutral-800/60 border border-neutral-700 rounded-lg p-3 sm:p-4 space-y-2">
            <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider">OBS Setup</p>
            <ol className="text-xs text-neutral-400 space-y-1 list-decimal list-inside">
              <li>Click <span className="text-white">+ → Browser Source</span></li>
              <li>Paste the URL into the URL field</li>
              <li>Set width <span className="text-white">1920</span> × height <span className="text-white">1080</span></li>
              <li>Click <span className="text-white">OK</span></li>
            </ol>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-semibold rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlayoutPage() {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [previewItem, setPreviewItem] = useState<PlaylistItem | null>(null);
  const [programItem, setProgramItem] = useState<PlaylistItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectName, setProjectName] = useState<string>("Loading...");
  const navigate = useNavigate();

  const programIframeRef = useRef<HTMLIFrameElement>(null);
  const [programElements, setProgramElements] = useState<CanvasElement[]>([]);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [previewElements, setPreviewElements] = useState<CanvasElement[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceData[]>([]);
  const [liveData, setLiveData] = useState<Record<string, Record<string, unknown>>>({});
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Mobile-specific state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMonitor, setActiveMonitor] = useState<'preview' | 'program'>('preview');
  const [monitorsCollapsed, setMonitorsCollapsed] = useState(false);

  useEffect(() => {
    socketService.connect();
    loadRundown();
    return () => { socketService.disconnect(); };
  }, []);

  useEffect(() => {
    const handleDataUpdate = (payload: DataUpdatePayload) => {
      setLiveData(prev => ({ ...prev, [payload.sourceId]: payload.data }));
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
    return () => { socketService.off('data:update'); };
  }, [programElements, previewElements]);

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
      if (e.key === '[') socketService.emit('data:csv-row', { sourceId: targetSource.id, rowIndex: Math.max(0, currentRow - 1) });
      else if (e.key === ']') socketService.emit('data:csv-row', { sourceId: targetSource.id, rowIndex: Math.min(rowCount - 1, currentRow + 1) });
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
        setPlaylist(items.sort((a: PlaylistItem, b: PlaylistItem) => a.order - b.order));
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
    const updated = [...playlist];
    updated.splice(index, 1);
    setPlaylist(updated);
    try {
      await api.updateProject(activeProjectId, projectName, updated.map((item, idx) => ({ graphicId: item.graphicId, order: idx })));
    } catch (err) {
      console.error("Failed to remove item:", err);
      loadRundown();
    }
  };

  const handleImportGraphic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const htmlContent = event.target?.result as string;
      try {
        // FIXED: Replaced api.saveGraphic with api.createGraphic and checked response.success directly
        const response = await api.createGraphic({ 
            name: file.name.replace('.html', ''), // Optional: cleaner name without extension
            html: htmlContent, 
            json: {}, 
            projectId: activeProjectId 
        });
        if (response.success) await loadRundown();
      } catch (err) {
        console.error("Failed to persist imported graphic:", err);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (index: number) => setDragOverIndex(index);
  const handleDrop = async (index: number) => {
    if (dragIndex === null || dragIndex === index || !activeProjectId) return;
    const updated = [...playlist];
    const [movedItem] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, movedItem);
    setPlaylist(updated);
    setDragIndex(null);
    setDragOverIndex(null);
    try {
      await api.updateProject(activeProjectId, projectName, updated.map((item, idx) => ({ graphicId: item.graphicId, order: idx })));
    } catch (err) {
      console.error("Failed to save reordered items:", err);
    }
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const getGraphicUrl = (filePath: string) => `${SERVER_URL}/graphics/${filePath.split('/').pop()}`;

  const handleLoadToPreview = (item: PlaylistItem) => {
    setPreviewItem(item);
    setPreviewElements(parseGraphicElements(item));
    // On mobile, switch to preview monitor after selecting
    setActiveMonitor('preview');
  };

  const handleTake = () => {
    if (!previewItem) return;
    const elements = parseGraphicElements(previewItem);
    const fullUrl = getGraphicUrl(previewItem.graphic.filePath);
    if (programItem) {
      programIframeRef.current?.contentWindow?.postMessage('out', '*');
      socketService.emit("command:clear");
      setTimeout(() => {
        setProgramItem(previewItem);
        setProgramElements(elements);
        socketService.emit("command:take", { url: fullUrl, elements, liveData });
      }, 1500);
    } else {
      setProgramItem(previewItem);
      setProgramElements(elements);
      socketService.emit("command:take", { url: fullUrl, elements, liveData });
    }
    // Switch to program view on mobile after take
    setActiveMonitor('program');
  };

  const handleClearProgram = () => {
    programIframeRef.current?.contentWindow?.postMessage('out', '*');
    socketService.emit("command:clear");
    setTimeout(() => { setProgramItem(null); setProgramElements([]); }, 1000);
  };

  const applyAllCachedData = (
    iframeRef: React.RefObject<HTMLIFrameElement | null>,
    elements: CanvasElement[],
    currentLiveData: Record<string, Record<string, unknown>>
  ) => {
    if (!iframeRef.current || elements.length === 0) return;
    Object.entries(currentLiveData).forEach(([sourceId, data]) => {
      const updates = resolveBindings(elements, sourceId, data);
      if (updates.length > 0) pushUpdatesToIframe(iframeRef.current, updates);
    });
  };

  const renderMonitorContent = (
    item: PlaylistItem | null,
    label: string,
    shouldAutoPlay: boolean,
    externalIframeRef: React.RefObject<HTMLIFrameElement | null>,
    elements: CanvasElement[]
  ) => {
    if (!item) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
          <Square size={32} className="mb-2 opacity-50" />
          <span className="text-xs font-medium">NO SOURCE</span>
        </div>
      );
    }
    return (
      <ScaledFrame
        src={getGraphicUrl(item.graphic.filePath)}
        title={label}
        autoPlay={shouldAutoPlay}
        iframeRef={externalIframeRef}
        onIframeLoad={() => applyAllCachedData(externalIframeRef, elements, liveData)}
      />
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#140a24] text-white overflow-hidden font-sans">

      {showOutputDialog && <OutputUrlDialog onClose={() => setShowOutputDialog(false)} />}

      {/* HEADER — compact on mobile */}
      <header className="h-12 sm:h-14 bg-[#1a0f2e] border-b border-purple-900/40 flex shrink-0 items-center px-3 sm:px-6 justify-between shadow-md z-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <img src={transLogo} alt="Graphyne Logo" className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="text-purple-400 font-light text-sm sm:text-base">PLAYOUT</span>
        </div>

        {/* Desktop header actions */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="text-right mr-2">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">ACTIVE SHOW</div>
            <div className="text-sm font-bold text-gray-200">{projectName}</div>
          </div>
          {dataSources.length > 0 && (
            <div className="text-[10px] text-orange-400 font-bold px-2 py-1 bg-orange-950/30 border border-orange-900/30 rounded">
              📡 {dataSources.length} DATA SOURCE{dataSources.length !== 1 ? 'S' : ''}
            </div>
          )}
          <button
            onClick={() => setShowOutputDialog(true)}
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

        {/* Mobile header: show name + hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <span className="text-xs text-gray-400 truncate max-w-28">{projectName}</span>
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-[#1a0f2e] border-b border-purple-900/40 px-3 py-2 flex flex-col gap-2 z-20">
          {dataSources.length > 0 && (
            <div className="text-[10px] text-orange-400 font-bold px-2 py-1 bg-orange-950/30 border border-orange-900/30 rounded w-fit">
              📡 {dataSources.length} DATA SOURCE{dataSources.length !== 1 ? 'S' : ''}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowOutputDialog(true); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded text-blue-400 border border-blue-900/30 transition-colors"
            >
              <ExternalLink size={13} /> OUTPUT
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded text-gray-300 border border-gray-700 transition-colors"
              onClick={() => { navigate("/editor"); setMobileMenuOpen(false); }}
            >
              <VectorSquare size={13} /> EDITOR
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* ── MONITORS SECTION ── */}
        <div className="shrink-0">
          {/* Collapse toggle on mobile */}
          <button
            className="sm:hidden w-full flex items-center justify-between px-4 py-2 bg-[#1a0f2e] border-b border-purple-900/30 text-xs text-gray-400 hover:text-white transition-colors"
            onClick={() => setMonitorsCollapsed(v => !v)}
          >
            <span className="font-bold uppercase tracking-wider">Monitors</span>
            {monitorsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {!monitorsCollapsed && (
            <>
              {/* Mobile: tab switcher between PVW and PGM */}
              <div className="sm:hidden flex border-b border-purple-900/30 bg-[#1a0f2e]">
                <button
                  onClick={() => setActiveMonitor('preview')}
                  className={`flex-1 py-2 text-xs font-bold tracking-wider transition-colors ${
                    activeMonitor === 'preview'
                      ? 'text-purple-300 border-b-2 border-purple-500 bg-purple-950/20'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  PVW — {previewItem ? previewItem.graphic.name : 'IDLE'}
                </button>
                <button
                  onClick={() => setActiveMonitor('program')}
                  className={`flex-1 py-2 text-xs font-bold tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                    activeMonitor === 'program'
                      ? 'text-red-400 border-b-2 border-red-500 bg-red-950/20'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {programItem && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  PGM — {programItem ? programItem.graphic.name : 'BLACK'}
                </button>
              </div>

              {/* Monitor frames */}
              <div className="p-2 sm:p-4 sm:pb-0 max-w-5xl mx-auto w-full">
                {/* Mobile: single active monitor */}
                <div className="sm:hidden">
                  {activeMonitor === 'preview' ? (
                    <div className="relative w-full aspect-video bg-[#20123a] border border-purple-900/40 overflow-hidden rounded-lg">
                      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(#a78bfa 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                      {renderMonitorContent(previewItem, "Preview", true, previewIframeRef, previewElements)}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-purple-600/90 text-white text-[9px] font-bold tracking-widest rounded">PVW</div>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-video bg-black border-2 border-red-900 overflow-hidden rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.1)]">
                      {renderMonitorContent(programItem, "Program", true, programIframeRef, programElements)}
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold tracking-widest rounded">ON AIR</div>
                    </div>
                  )}
                </div>

                {/* Desktop: side-by-side monitors */}
                <div className="hidden sm:grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end px-1">
                      <span className="text-xs font-bold text-gray-400 tracking-wider">PREVIEW</span>
                      <span className="text-xs text-purple-300 font-mono">{previewItem ? previewItem.graphic.name : "IDLE"}</span>
                    </div>
                    <div className="relative w-full aspect-video bg-[#20123a] border border-purple-900/40 overflow-hidden rounded-lg shadow-inner">
                      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(#a78bfa 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                      {renderMonitorContent(previewItem, "Preview", true, previewIframeRef, previewElements)}
                      <div className="absolute top-3 left-3 px-2 py-0.5 bg-purple-600/90 text-white text-[10px] font-bold tracking-widest rounded">PVW</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end px-1">
                      <span className="text-xs font-bold text-red-500 tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        PROGRAM
                      </span>
                      <span className="text-xs text-red-400 font-mono">{programItem ? programItem.graphic.name : "BLACK"}</span>
                    </div>
                    <div className="relative w-full aspect-video bg-black rounded-lg border-2 border-red-900 overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.15)]">
                      {renderMonitorContent(programItem, "Program", true, programIframeRef, programElements)}
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold tracking-widest rounded">ON AIR</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── TRANSPORT CONTROLS ── */}
        <div className="shrink-0 px-2 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 bg-[#140a24]">

          {/* Take + Clear */}
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleTake}
              disabled={!previewItem}
              className={`
                flex-1 sm:flex-none sm:w-44 h-11 sm:h-12 rounded-lg font-black tracking-[0.12em] transition-all duration-200
                flex items-center justify-center gap-2 text-sm
                ${previewItem
                  ? "bg-purple-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700"
                }
              `}
            >
              <Play size={16} className={previewItem ? "fill-current" : ""} />
              TAKE
            </button>
            <button
              onClick={handleClearProgram}
              disabled={!programItem}
              className={`
                flex-1 sm:flex-none sm:w-28 h-11 sm:h-12 rounded-lg font-bold tracking-widest border-2 transition-all duration-200
                flex items-center justify-center gap-2 text-sm
                ${programItem
                  ? "border-red-900/50 text-red-500 hover:bg-red-950 hover:border-red-600 active:scale-95"
                  : "border-gray-800 text-gray-700 cursor-not-allowed bg-gray-900"
                }
              `}
            >
              <Square size={15} className={programItem ? "fill-current" : ""} />
              CLEAR
            </button>
          </div>

          {/* CSV Controls — scrollable row on mobile */}
          {dataSources.some(s => s.type === 'csv-file') && (
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {dataSources.filter(s => s.type === 'csv-file').map(source => {
                const data = liveData[source.id] || {};
                const currentRow = (data.__currentRow as number) ?? 0;
                const rowCount = (data.__rowCount as number) ?? 0;
                return (
                  <div key={source.id} className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 bg-[#20123a] border border-purple-900/40 rounded">
                    <span className="text-xs font-bold text-gray-300 max-w-20 truncate">📄 {source.name}</span>
                    <div className="flex items-center bg-gray-900 rounded border border-gray-700 overflow-hidden">
                      <button
                        onClick={() => socketService.emit('data:csv-row', { sourceId: source.id, rowIndex: Math.max(0, currentRow - 1) })}
                        className="px-2 py-1.5 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-xs font-mono text-purple-300 px-2 text-center font-bold">
                        {rowCount > 0 ? currentRow + 1 : 0} <span className="text-gray-600">/</span> {rowCount}
                      </span>
                      <button
                        onClick={() => socketService.emit('data:csv-row', { sourceId: source.id, rowIndex: Math.min(rowCount - 1, currentRow + 1) })}
                        className="px-2 py-1.5 hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RUNDOWN LIST ── */}
        <div className="flex-1 flex flex-col bg-[#1a0f2e] border-t border-purple-900/30 overflow-hidden min-h-0">
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-[#20123a] border-b border-purple-900/30 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-gray-300 flex items-center gap-2 text-sm">
              <div className="w-1 h-4 bg-blue-500 rounded-full" />
              RUNDOWN
              <span className="text-[10px] text-gray-500 font-normal">({playlist.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => importFileInputRef.current?.click()}
                className="px-2.5 sm:px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-xs font-bold text-white rounded transition-colors"
              >
                + IMPORT
              </button>
              <input ref={importFileInputRef} type="file" accept=".html" className="hidden" onChange={handleImportGraphic} />
              <button
                onClick={loadRundown}
                className="p-1.5 text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
              >
                <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-1">
            {playlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2 py-8">
                <AlertCircle size={28} className="opacity-20" />
                <p className="text-sm">Rundown is empty.</p>
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
                    onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleLoadToPreview(item)}
                    className={`
                      group flex items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg cursor-pointer border transition-all duration-150 relative overflow-hidden
                      ${isDragging ? "opacity-50" : ""}
                      ${isDragOver ? "border-t-2 border-t-blue-500" : ""}
                      ${isProgram
                        ? "bg-pink-950/30 border-pink-900/60"
                        : isPreview
                        ? "bg-purple-900/30 border-purple-500"
                        : "bg-[#20123a] border-transparent hover:bg-gray-800 hover:border-gray-700"
                      }
                    `}
                  >
                    {(isPreview || isProgram) && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isProgram ? "bg-red-500" : "bg-blue-500"}`} />
                    )}
                    <div className="w-6 sm:w-8 font-mono text-xs text-gray-600 text-center shrink-0">
                      {(index + 1).toString().padStart(2, "0")}
                    </div>
                    <div className="w-5 sm:w-8 flex justify-center mr-1 sm:mr-2 shrink-0">
                      {isProgram && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(239,68,68,1)]" />}
                      {!isProgram && isPreview && <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_6px_rgba(59,130,246,1)]" />}
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <span className={`text-sm font-bold truncate ${isProgram ? "text-red-400" : isPreview ? "text-purple-300" : "text-gray-200"}`}>
                        {item.graphic.name}
                      </span>
                      <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wide hidden sm:block">HTML5 SOURCE</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {(isProgram || isPreview) && (
                        <span className={`text-[9px] sm:text-[10px] font-black tracking-wider ${isProgram ? "text-red-500" : "text-blue-500"}`}>
                          {isProgram ? "ON AIR" : "NEXT"}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleRemoveItem(e, index)}
                        className="p-1 sm:p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 sm:transition-opacity active:opacity-100 transition-opacity"
                        title="Remove from Rundown"
                      >
                        <Trash2 size={14} />
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