import React from "react";
import { useNavigate } from "react-router-dom";
import { MonitorPlay, Download, Loader2 } from "lucide-react";

// 1. Imports for Logic
import { useAppSelector } from "../store/hooks"; //
import { api } from "../services/api"; //
import { compileGraphicToHTML } from "../utils/exporter"; //

// 2. Component Imports
import { Artboard } from "../components/Canvas/Artboard";
import { LayersPanel } from "../components/UI/LayersPanel";
import { Toolbar } from "../components/UI/Toolbar";
import { PropertiesPanel } from "../components/UI/PropertiesPanel";

export function EditorPage() {
  // 3. Access Redux State (wrapped in .present due to redux-undo)
  const { config, elements, selectedIds } = useAppSelector(
    (state) => state.canvas.present,
  );
  
  const [isSaving, setIsSaving] = React.useState(false);
  const navigate = useNavigate();

  // 4. Handle Export / Save to DB
  const handleExport = async () => {
    const graphicName = prompt("Enter a name for this graphic:", "New Graphic");
    if (!graphicName) return;

    setIsSaving(true);
    try {
      // A. Compile State to HTML String (includes GSAP & Fonts)
      const htmlContent = await compileGraphicToHTML(config, elements);

      // B. Send to Backend (Saves to Disk & DB)
      // We pass the raw elements/config as 'json' so the Editor can re-open this file later.
      const result = await api.saveGraphic({
        name: graphicName,
        html: htmlContent,
        json: { config, elements, selectedIds }, 
        projectId: "8a73a5a5-0812-4da6-9339-a81d2f420fe2" //HARDCODED PROJECT ID FOR TESTING
      });

      if (result.status === 200 || result.data.success) {
        alert(`✅ Saved "${graphicName}" to Database!`);
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
      {/* --- HEADER --- */}
      <header className="h-20 bg-gray-900 border-b border-gray-800 flex flex-col justify-center px-4 z-20">
        <div className="flex items-center justify-between w-full">
          
          {/* Logo & Menus */}
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg tracking-tight text-blue-500">
              Graphyne{" "}
              <span className="text-gray-500 text-xs font-normal">EDITOR</span>
            </h1>
            <div className="flex gap-2 text-sm text-gray-400">
              <span className="hover:text-white cursor-pointer">File</span>
              <span className="hover:text-white cursor-pointer">Edit</span>
              <span className="hover:text-white cursor-pointer">View</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            
            {/* EXPORT / SAVE BUTTON */}
            <button
              onClick={handleExport}
              disabled={isSaving}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors
                ${isSaving ? "bg-blue-800 cursor-wait" : "bg-blue-600 hover:bg-blue-500 text-white"}
              `}
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              {isSaving ? "SAVING..." : "EXPORT TO DB"}
            </button>

            {/* PLAYOUT NAVIGATION */}
            <button
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded text-gray-300 border border-gray-700"
              onClick={() => navigate("/playout")}
            >
              <MonitorPlay size={14} /> PLAYOUT
            </button>
          </div>
        </div>
        
        {/* Toolbar Component */}
        <Toolbar />
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Layers */}
        <LayersPanel />

        {/* Center: Canvas */}
        <div className="flex-1 bg-gray-800/50 relative overflow-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center overflow-auto p-8">
            <div className="shadow-2xl shadow-black/50">
              <Artboard />
            </div>
          </div>
        </div>

        {/* Right: Properties */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-10">
          <div className="flex border-b border-gray-800"></div>
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}