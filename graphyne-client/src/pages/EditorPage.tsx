import React from 'react';
import { Artboard } from "../components/Canvas/Artboard";
import {
  MonitorPlay,
  Layers,
  MousePointer2,
  Square,
  Type,
  Image as ImageIcon,
  Download,
  Loader2 
} from "lucide-react";

// Imports for Logic
import { useAppSelector } from '../store/hooks';
import { api } from '../services/api';
import { compileGraphicToHTML } from '../utils/exporter';

// PLACEHOLDER TOOLBAR
const MockToolbar = () => (
        <div className="flex w-full mt-2">
          <div className="flex gap-2">
            <div className="p-2 bg-blue-600 rounded text-white"><MousePointer2 size={20} /></div>
            <div className="p-2 text-gray-400 hover:text-white"><Square size={20} /></div>
            <div className="p-2 text-gray-400 hover:text-white"><Type size={20} /></div>
            <div className="p-2 text-gray-400 hover:text-white"><ImageIcon size={20} /></div>
          </div>
        </div>
);

// PLACEHOLDER PROPERTIES
const MockProperties = () => (
  <div className="p-4 text-gray-300 space-y-4">
    <h3 className="text-sm font-bold text-gray-500 uppercase">Transform</h3>
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-gray-800 p-2 rounded text-xs">X: 100</div>
      <div className="bg-gray-800 p-2 rounded text-xs">Y: 250</div>
    </div>
    <h3 className="text-sm font-bold text-gray-500 uppercase mt-4">Appearance</h3>
    <div className="h-8 bg-red-500 rounded border border-gray-600"></div>
  </div>
);

// PLACEHOLDER LAYERS
const MockLayers = () => (
  <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-10 transition-all duration-300">
     <div className="p-3 border-b border-gray-800 font-bold text-xs text-gray-500 uppercase tracking-wider">Layers</div>
    <div className="flex-1 overflow-y-auto">
      {[1, 2, 3].map((i) => (
        <div key={i} className="px-4 py-2 border-b border-gray-800 text-sm text-gray-300 hover:bg-gray-800 cursor-pointer flex items-center gap-2">
          <Layers size={14} /> Layer {i}
        </div>
      ))}
    </div>
  </div>
);

export function EditorPage() {
  // 1. Access Redux State (Using 'canvasConfig' to match types)
  const { canvasConfig, elements, selectedIds } = useAppSelector((state) => state.canvas.present);
  const [isSaving, setIsSaving] = React.useState(false);

  // 2. Export Logic
  const handleExport = async () => {
    const graphicName = prompt("Enter a name for this graphic:", "New Graphic");
    if (!graphicName) return;

    setIsSaving(true);
    try {
      // Compile State to HTML String
      const htmlContent = await compileGraphicToHTML(canvasConfig, elements);

      // Send to Backend
      const result = await api.saveGraphic({
        name: graphicName,
        html: htmlContent,
        json: { canvasConfig, elements, selectedIds }
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
            <button 
              onClick={handleExport}
              disabled={isSaving}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                isSaving ? 'bg-blue-800 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Download size={14} />} 
              {isSaving ? 'SAVING...' : 'EXPORT'}
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded text-gray-300 border border-gray-700">
              <MonitorPlay size={14} /> PLAYOUT
            </button>
          </div>
        </div>
        <MockToolbar />
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        <MockLayers />
        <div className="flex-1 bg-gray-800/50 relative overflow-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center overflow-auto p-8">
            <div className="shadow-2xl shadow-black/50">
              <Artboard />
            </div>
          </div>
        </div>
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-10">
          <div className="flex border-b border-gray-800"></div>
            <MockProperties />
        </div>
      </div>
    </div>
  );
}