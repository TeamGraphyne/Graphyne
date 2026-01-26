import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorPlay, Loader2, Save } from "lucide-react";

// 1. Imports for Logic
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setGraphicMeta } from "../store/canvasSlice";
import { api } from "../services/api"; 
import { compileGraphicToHTML } from "../utils/exporter"; 

// 2. Component Imports
import { Artboard } from "../components/Canvas/Artboard";
import { LayersPanel } from "../components/UI/LayersPanel";
import { Toolbar } from "../components/UI/Toolbar";
import { PropertiesPanel } from "../components/UI/PropertiesPanel";

export function EditorPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // 3. Access Redux State (wrapped in .present due to redux-undo)
  // We now also access 'meta' to know if we are editing an existing graphic
  const { config, elements, selectedIds, meta } = useAppSelector(
    (state) => state.canvas.present,
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);

  // 4. Fetch Projects on Mount
  useEffect(() => {
    api.getProjects().then(data => {
      setProjects(data);
    }).catch(err => console.error("Failed to load projects", err));
  }, []);

  // 5. Handle Project Selection
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setGraphicMeta({ projectId: e.target.value || null }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setGraphicMeta({ name: e.target.value }));
  };

  // 6. Handle Export / Save to DB
  const handleExport = async () => {
    // If no name set, force prompt
    let graphicName = meta.name;
    if (!graphicName || graphicName === "New Graphic") {
        const input = prompt("Enter a name for this graphic:", meta.name);
        if (!input) return; // Cancelled
        graphicName = input;
        dispatch(setGraphicMeta({ name: input }));
    }

    setIsSaving(true);
    try {
      // A. Compile State to HTML String (includes GSAP & Fonts)
      const htmlContent = await compileGraphicToHTML(config, elements);

      // B. Send to Backend
      // We pass 'id' (if it exists) to update. If null, backend creates new.
      // We pass 'projectId' so backend links it to the playlist.
      const result = await api.saveGraphic({
        id: meta.id,
        name: graphicName,
        html: htmlContent,
        json: { config, elements, selectedIds }, 
        projectId: meta.projectId 
      });

      if (result.status === 200 || result.data.success) {
        // C. Update State with the ID returned from DB (Crucial for subsequent updates)
        dispatch(setGraphicMeta({ id: result.data.id }));
        
        alert(`✅ Saved "${graphicName}" to ${meta.projectId ? 'Project & ' : ''}Library!`);
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
          
          {/* Logo & Info */}
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg tracking-tight text-blue-500">
              Graphyne{" "}
              <span className="text-gray-500 text-xs font-normal">EDITOR</span>
            </h1>
            
            {/* Quick Name Edit */}
            <input 
              type="text" 
              value={meta.name} 
              onChange={handleNameChange}
              className="bg-transparent border border-transparent hover:border-gray-700 focus:border-blue-500 text-sm px-2 py-1 rounded outline-none transition-colors"
            />
          </div>

          {/* Context & Actions */}
          <div className="flex gap-2 items-center">
            
            {/* Project Selector */}
            <div className="flex items-center gap-2 mr-4">
                <span className="text-xs text-gray-500 uppercase font-bold">Target Project:</span>
                <select 
                    value={meta.projectId || ""} 
                    onChange={handleProjectChange}
                    className="bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5 focus:border-blue-500 outline-none"
                >
                    <option value="">(None - Library Only)</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* EXPORT / SAVE BUTTON */}
            <button
              onClick={handleExport}
              disabled={isSaving}
              className={`
                flex items-center gap-2 px-4 py-1.5 rounded text-xs font-bold transition-colors shadow-lg
                ${isSaving ? "bg-blue-900 text-blue-200 cursor-wait" : "bg-blue-600 hover:bg-blue-500 text-white"}
              `}
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isSaving ? "SAVING..." : (meta.id ? "UPDATE" : "SAVE")}
            </button>

            {/* PLAYOUT NAVIGATION */}
            <button
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded text-gray-300 border border-gray-700 ml-2"
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