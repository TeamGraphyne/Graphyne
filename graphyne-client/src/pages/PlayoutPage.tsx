import { useState } from 'react';

// --- Types for our Dummy Data ---
interface GraphicItem {
  id: string;
  name: string;
  type: 'Lower Third' | 'Ticker' | 'Full Screen';
  status: 'idle' | 'preview' | 'live';
}

// --- Mock Playlist Data ---
const MOCK_PLAYLIST: GraphicItem[] = [
  { id: '1', name: 'Breaking News Intro', type: 'Full Screen', status: 'idle' },
  { id: '2', name: 'Presenter Name: John Doe', type: 'Lower Third', status: 'idle' },
  { id: '3', name: 'Stock Ticker', type: 'Ticker', status: 'idle' },
  { id: '4', name: 'Sports Scorebug', type: 'Lower Third', status: 'idle' },
];

export function PlayoutPage() {
  // State for the two main "Buses"
  const [previewItem, setPreviewItem] = useState<GraphicItem | null>(null);
  const [programItem, setProgramItem] = useState<GraphicItem | null>(null);
  
  // State for the playlist (to show status indicators)
  const [playlist] = useState<GraphicItem[]>(MOCK_PLAYLIST);

  // --- Actions ---
  
  // 1. Load to Preview (Clicking a playlist item)
  const handleLoadToPreview = (item: GraphicItem) => {
    setPreviewItem(item);
  };

  // 2. Take (Move Preview to Program)
  const handleTake = () => {
    if (previewItem) {
      setProgramItem(previewItem);
    }
  };

  // 3. Clear (Remove from Program)
  const handleClearProgram = () => {
    setProgramItem(null);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      
      {/* HEADER */}
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between">
        <h1 className="font-bold text-lg text-blue-500">Graphyne <span className="text-gray-400">Live Playout</span></h1>
        <div className="text-xs text-gray-500">Connected: Localhost</div>
      </header>

      {/* MAIN MONITOR BRIDGE */}
      <div className="flex-1 flex flex-col p-4 gap-4">
        
        {/* TOP ROW: MONITORS */}
        <div className="flex flex-row gap-4 h-[45%] min-h-[300px]">
          
          {/* PREVIEW WINDOW */}
          <div className="flex-1 flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden relative">
            <div className="bg-gray-800 px-3 py-1 text-xs font-bold text-gray-400 tracking-wider flex justify-between">
              <span>PREVIEW</span>
              {previewItem && <span className="text-blue-400">{previewItem.name}</span>}
            </div>
            
            {/* The "Screen" */}
            <div className="flex-1 flex items-center justify-center bg-gray-950 relative">
              {/* Checkerboard Pattern for Transparency */}
              <div className="absolute inset-0 opacity-10" 
                   style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              </div>
              
              {previewItem ? (
                <div className="w-[80%] h-[60%] border-2 border-dashed border-blue-500/30 flex items-center justify-center text-blue-500 bg-blue-500/10 rounded">
                  <span className="text-2xl font-bold">{previewItem.name}</span>
                </div>
              ) : (
                <div className="text-gray-700">No Preview Loaded</div>
              )}
            </div>
          </div>

          {/* PROGRAM WINDOW */}
          <div className="flex-1 flex flex-col bg-gray-900 rounded-lg border-2 border-red-900 overflow-hidden relative shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            <div className="bg-red-950 px-3 py-1 text-xs font-bold text-red-500 tracking-wider flex justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                PROGRAM / ON-AIR
              </span>
              {programItem && <span className="text-white">{programItem.name}</span>}
            </div>
            
            {/* The "Screen" */}
            <div className="flex-1 flex items-center justify-center bg-black">
              {programItem ? (
                <div className="w-full h-full flex items-center justify-center text-white bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="text-center">
                    <h2 className="text-4xl font-bold mb-2">{programItem.name}</h2>
                    <p className="text-gray-400">{programItem.type} Graphic</p>
                  </div>
                </div>
              ) : (
                <div className="text-gray-800 font-mono">BLACK</div>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: TRANSPORT CONTROLS */}
        <div className="h-16 flex items-center justify-center gap-4 bg-gray-900 rounded-lg border border-gray-800 px-8">
            <button 
              onClick={handleTake}
              disabled={!previewItem}
              className={`
                h-10 px-8 rounded font-bold tracking-widest transition-all
                ${previewItem 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/50 scale-100' 
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'}
              `}
            >
              TAKE
            </button>
            
            <button 
              onClick={handleClearProgram}
              disabled={!programItem}
              className={`
                h-10 px-8 rounded font-bold tracking-widest border transition-all
                ${programItem 
                  ? 'border-red-900 text-red-500 hover:bg-red-900/30' 
                  : 'border-gray-800 text-gray-700 cursor-not-allowed'}
              `}
            >
              CLEAR
            </button>
        </div>

        {/* BOTTOM ROW: PLAYLIST / RUNDOWN */}
        <div className="flex-1 flex flex-col bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 font-bold text-sm text-gray-300">
            RUNDOWN
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {playlist.map((item) => {
               // Determine visual state of row
               const isPreview = previewItem?.id === item.id;
               const isProgram = programItem?.id === item.id;
               
               return (
                 <div 
                   key={item.id}
                   onClick={() => handleLoadToPreview(item)}
                   className={`
                     flex items-center p-3 rounded cursor-pointer border transition-colors
                     ${isProgram 
                        ? 'bg-red-900/20 border-red-900/50' 
                        : isPreview 
                          ? 'bg-blue-900/20 border-blue-500/50' 
                          : 'bg-gray-800/50 border-transparent hover:bg-gray-800 hover:border-gray-600'}
                   `}
                 >
                   {/* Status Indicator */}
                   <div className="w-8 flex justify-center">
                      {isProgram && <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                      {!isProgram && isPreview && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                   </div>

                   {/* Content */}
                   <div className="flex-1">
                     <div className={`font-medium ${isProgram ? 'text-red-400' : isPreview ? 'text-blue-400' : 'text-gray-200'}`}>
                       {item.name}
                     </div>
                     <div className="text-xs text-gray-500">{item.type}</div>
                   </div>

                   {/* Action Hint */}
                   <div className="text-xs font-mono text-gray-600 px-2">
                     {isProgram ? 'ON AIR' : 'LOAD'}
                   </div>
                 </div>
               );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}