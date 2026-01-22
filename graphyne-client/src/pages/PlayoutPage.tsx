import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Square, MonitorPlay, Trash2, Loader2 } from 'lucide-react';

// --- Types ---
interface GraphicItem {
  id: string;
  name: string;
  type: string;
  url: string; 
  file: File;  
}

export function PlayoutPage() {
  // --- State ---
  const [playlist, setPlaylist] = useState<GraphicItem[]>([]);
  const [previewItem, setPreviewItem] = useState<GraphicItem | null>(null);
  const [programItem, setProgramItem] = useState<GraphicItem | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // --- Refs for Iframes (To send commands) ---
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const programIframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup Blob URLs
  useEffect(() => {
    return () => {
      playlist.forEach(item => URL.revokeObjectURL(item.url));
    };
  }, [playlist]);

  // --- Animation Control Helper ---
  const sendCommand = (iframe: HTMLIFrameElement | null, command: 'in' | 'out') => {
    if (iframe && iframe.contentWindow) {
      console.log(`Sending command: ${command}`);
      
      // 1. Standard PostMessage (Preferred)
      // The HTML graphic should listen for: window.addEventListener('message', (e) => { if(e.data === 'in') ... })
      iframe.contentWindow.postMessage(command, '*');

      // 2. Legacy Key Press Simulation (Matches your '1' and '2' description)
      // This attempts to press '1' for IN and '2' for OUT programmatically
      const key = command === 'in' ? '1' : '2';
      const event = new KeyboardEvent('keydown', {
        key: key,
        code: command === 'in' ? 'Digit1' : 'Digit2',
        keyCode: command === 'in' ? 49 : 50,
        bubbles: true,
        cancelable: true,
        view: iframe.contentWindow
      });
      iframe.contentWindow.dispatchEvent(event);
    }
  };

  // --- Actions ---

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const objectUrl = URL.createObjectURL(file);

      const newItem: GraphicItem = {
        id: crypto.randomUUID(),
        name: file.name.replace('.html', ''), 
        type: 'HTML Graphic',
        url: objectUrl,
        file: file
      };

      setPlaylist(prev => [...prev, newItem]);
    }
    if (e.target) e.target.value = ''; 
  };

  const handleLoadToPreview = (item: GraphicItem) => {
    setPreviewItem(item);
    // Animation is triggered via onLoad below
  };

  const handleTake = () => {
    if (previewItem) {
      setIsClearing(false); // Cancel any active clearing
      setProgramItem(previewItem);
      // Animation is triggered via onLoad below
    }
  };

  const handleClearProgram = () => {
    if (programItem && !isClearing) {
      setIsClearing(true);
      
      // 1. Trigger Animation Out
      sendCommand(programIframeRef.current, 'out');

      // 2. Wait for animation to finish before removing (Hardcoded 1s buffer)
      // Ideally, the graphic would postMessage back saying "I'm done", but a timer is safer for generic files.
      setTimeout(() => {
        setProgramItem(null);
        setIsClearing(false);
      }, 1000); 
    }
  };
  
  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPlaylist(prev => prev.filter(item => item.id !== id));
    if (previewItem?.id === id) setPreviewItem(null);
  };

  // --- Iframe Event Handlers ---
  const handleIframeLoad = (type: 'preview' | 'program') => {
    const ref = type === 'preview' ? previewIframeRef : programIframeRef;
    
    // Slight delay to ensure the graphic's internal JS has initialized listeners
    setTimeout(() => {
        sendCommand(ref.current, 'in');
    }, 200);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 justify-between shadow-md z-10">
        <div className="flex items-center gap-2">
            <MonitorPlay className="text-blue-500" size={24} />
            <h1 className="font-bold text-xl tracking-tight text-gray-100">Graphyne <span className="text-blue-500 font-light">PLAYOUT</span></h1>
        </div>
        <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-gray-800 rounded border border-gray-700 text-xs font-mono text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                ENGINE READY
            </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col p-6 gap-6 max-w-[1920px] mx-auto w-full">
        
        {/* TOP ROW: MONITORS */}
        <div className="grid grid-cols-2 gap-6 w-full">
          
          {/* PREVIEW WINDOW */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end px-1">
                <span className="text-sm font-bold text-gray-400 tracking-wider">PREVIEW</span>
                <span className="text-xs text-blue-400 font-mono">{previewItem ? previewItem.name : 'IDLE'}</span>
            </div>
            
            <div className="relative w-full aspect-video bg-gray-900 rounded-lg border-2 border-gray-700 overflow-hidden shadow-inner group">
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#6b7280 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                {previewItem ? (
                  <iframe 
                    ref={previewIframeRef}
                    src={previewItem.url} 
                    onLoad={() => handleIframeLoad('preview')}
                    className="w-full h-full border-0 pointer-events-none" 
                    title="Preview"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                    <Square size={48} className="mb-2 opacity-50" />
                    <span className="text-sm font-medium">NO SOURCE</span>
                  </div>
                )}
                
                <div className="absolute top-4 left-4 px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-bold tracking-widest rounded shadow-sm">
                    PVW
                </div>
            </div>
          </div>

          {/* PROGRAM WINDOW */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end px-1">
                <span className="text-sm font-bold text-red-500 tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"/>
                    PROGRAM
                </span>
                <span className="text-xs text-red-400 font-mono">{programItem ? programItem.name : 'BLACK'}</span>
            </div>
            
            <div className="relative w-full aspect-video bg-black rounded-lg border-2 border-red-900 overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.15)]">
                {programItem ? (
                  <iframe 
                    ref={programIframeRef}
                    src={programItem.url} 
                    onLoad={() => handleIframeLoad('program')}
                    className="w-full h-full border-0 pointer-events-none"
                    title="Program"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-800 font-black text-4xl tracking-[0.2em] opacity-50 select-none">BLACK</span>
                  </div>
                )}

                <div className="absolute top-4 right-4 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold tracking-widest rounded shadow-sm">
                    {isClearing ? 'CLEARING...' : 'ON AIR'}
                </div>
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: TRANSPORT CONTROLS */}
        <div className="flex justify-center items-center py-2">
             <div className="flex gap-4 p-2 bg-gray-900 rounded-xl border border-gray-800 shadow-xl">
                <button 
                  onClick={handleTake}
                  disabled={!previewItem}
                  className={`
                    group relative overflow-hidden w-48 h-12 rounded-lg font-black tracking-[0.15em] transition-all duration-200
                    flex items-center justify-center gap-2
                    ${previewItem 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105 active:scale-95' 
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'}
                  `}
                >
                  <Play size={18} className={previewItem ? "fill-current" : ""} />
                  TAKE
                </button>
                
                <button 
                  onClick={handleClearProgram}
                  disabled={!programItem || isClearing}
                  className={`
                    w-32 h-12 rounded-lg font-bold tracking-widest border-2 transition-all duration-200
                    flex items-center justify-center gap-2
                    ${programItem && !isClearing
                      ? 'border-red-900/50 text-red-500 hover:bg-red-950 hover:border-red-600 active:scale-95' 
                      : 'border-gray-800 text-gray-700 cursor-not-allowed bg-gray-900'}
                  `}
                >
                  {isClearing ? <Loader2 className="animate-spin" size={16} /> : <Square size={16} className="fill-current" />}
                  {isClearing ? 'WAIT' : 'CLEAR'}
                </button>
             </div>
        </div>

        {/* BOTTOM ROW: RUNDOWN */}
        <div className="flex-1 flex flex-col bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg min-h-0">
          
          {/* Rundown Toolbar */}
          <div className="px-4 py-3 bg-gray-850 border-b border-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-gray-300 flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"/>
                RUNDOWN
            </h3>
            
            <div>
                <input 
                    type="file" 
                    accept=".html" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                />
                <button 
                    onClick={handleImportClick}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded border border-gray-700 transition-colors"
                >
                    <Upload size={14} /> IMPORT GRAPHIC
                </button>
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {playlist.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                    <Upload size={32} className="opacity-20"/>
                    <p className="text-sm">Playlist is empty. Import HTML graphics to begin.</p>
                </div>
            ) : (
                playlist.map((item) => {
                    const isPreview = previewItem?.id === item.id;
                    const isProgram = programItem?.id === item.id;
                    
                    return (
                        <div 
                        key={item.id}
                        onClick={() => handleLoadToPreview(item)}
                        className={`
                            group flex items-center px-4 py-3 rounded-lg cursor-pointer border transition-all duration-150 relative overflow-hidden
                            ${isProgram 
                                ? 'bg-red-950/30 border-red-900/60 shadow-[inset_0_0_10px_rgba(220,38,38,0.1)]' 
                                : isPreview 
                                ? 'bg-blue-950/30 border-blue-600/50 shadow-[inset_0_0_10px_rgba(37,99,235,0.1)]' 
                                : 'bg-gray-800/40 border-transparent hover:bg-gray-800 hover:border-gray-700'}
                        `}
                        >
                            {(isPreview || isProgram) && (
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isProgram ? 'bg-red-500' : 'bg-blue-500'}`} />
                            )}

                            <div className="w-8 flex justify-center mr-2">
                                {isProgram && <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]" />}
                                {!isProgram && isPreview && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,1)]" />}
                            </div>

                            <div className="flex-1 flex flex-col justify-center">
                                <span className={`text-sm font-bold truncate ${isProgram ? 'text-red-400' : isPreview ? 'text-blue-400' : 'text-gray-200'}`}>
                                    {item.name}
                                </span>
                                <span className="text-[10px] uppercase font-mono text-gray-500 tracking-wide">
                                    {item.type}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleDeleteItem(e, item.id)}
                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/50 rounded transition-colors"
                                    title="Remove from playlist"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="w-20 text-right">
                                <span className={`text-[10px] font-black tracking-wider ${isProgram ? 'text-red-600' : isPreview ? 'text-blue-600' : 'hidden'}`}>
                                    {isProgram ? 'ON AIR' : 'NEXT'}
                                </span>
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