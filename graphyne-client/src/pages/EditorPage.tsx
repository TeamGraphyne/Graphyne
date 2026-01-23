import React from 'react';
import { 
  MonitorPlay, Download, Loader2 
} from "lucide-react";

// 1. Imports for Logic
import { useAppSelector } from '../store/hooks';
import { api } from '../services/api';
import { compileGraphicToHTML } from '../utils/exporter';
import { Artboard } from "../components/Canvas/Artboard";
import { LayersPanel } from "../components/UI/LayersPanel";
import { Toolbar } from '../components/UI/Toolbar';

const MockProperties = () => ( <div className="p-4 text-gray-300 space-y-4"> <h3 className="text-sm font-bold text-gray-500 uppercase">Transform</h3> <div className="grid grid-cols-2 gap-2"> <div className="bg-gray-800 p-2 rounded text-xs">X: 100</div> <div className="bg-gray-800 p-2 rounded text-xs">Y: 250</div> </div> <h3 className="text-sm font-bold text-gray-500 uppercase mt-4"> Appearance </h3> <div className="h-8 bg-red-500 rounded border border-gray-600"></div> </div> );

export function EditorPage() {
  // 2. Access Redux State
  const { config, elements, selectedIds } = useAppSelector((state) => state.canvas.present);
  const [isSaving, setIsSaving] = React.useState(false);

  // 3. Handle Export Logic
  const handleExport = async () => {
    const graphicName = prompt("Enter a name for this graphic:", "New Graphic");
    if (!graphicName) return;

    setIsSaving(true);
    try {
      // A. Compile State to HTML String
      const htmlContent = await compileGraphicToHTML(config, elements);

      // B. Send to Backend (Saves to Disk & DB)
      const result = await api.saveGraphic({
        name: graphicName,
        html: htmlContent,
        json: { config, elements,selectedIds } // - Saving JSON for re-edit
      });

      if (result.status === 200 || result.data.success) {
        alert(`✅ Saved "${graphicName}" successfully!`);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("❌ Failed to save graphic. Check console.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* 1. HEADER */}
      <header className="h-20 bg-gray-900 border-b border-gray-800 flex flex-col justify-center px-4 z-20">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg tracking-tight text-blue-500">
              Graphyne <span className="text-gray-500 text-xs font-normal">EDITOR</span>
            </h1>
            <div className="flex gap-2 text-sm text-gray-400">
              <span className="hover:text-white cursor-pointer">File</span>
              <span className="hover:text-white cursor-pointer">Edit</span>
              <span className="hover:text-white cursor-pointer">View</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* 4. Connected Export Button */}
            <button 
              onClick={handleExport}
              disabled={isSaving}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors
                ${isSaving ? 'bg-blue-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white'}
              `}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
              {isSaving ? 'SAVING...' : 'EXPORT'}
            </button>
            
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded text-gray-300 border border-gray-700">
              <MonitorPlay size={14} /> PLAYOUT
            </button>
          </div>
        </div>
        <Toolbar />
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        <LayersPanel />
        
        {/* CENTER: Canvas */}
        <div className="flex-1 bg-gray-800/50 relative overflow-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center overflow-auto p-8">
            <div className="shadow-2xl shadow-black/50">
              <Artboard />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-10">
            <div className="flex border-b border-gray-800"></div>
            <MockProperties />
        </div>
      </div>
    </div>
  );
}