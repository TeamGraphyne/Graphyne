import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorPlay, Loader2, Save, FolderOpen, Database } from "lucide-react";

// 1. Imports for Logic
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { setGraphicMeta } from "../store/canvasSlice";
import { setSources, setLiveData, setError, updateSourceFields } from "../store/dataSlice";
import { api } from "../services/api"; 
import { compileGraphicToHTML } from "../utils/exporter";
import { socketService } from "../services/socket";

// 2. Component Imports
import { Artboard } from "../components/Canvas/Artboard";
import { LayersPanel } from "../components/UI/LayersPanel";
import { Toolbar } from "../components/UI/Toolbar";
import { PropertiesPanel } from "../components/UI/PropertiesPanel";
import { ProjectManager } from "../components/UI/ProjectManager";
import { DataSourceManager } from "../components/UI/DataSourceManager";

import type { DataUpdatePayload, DataErrorPayload, DataField } from "../types/datasource";

import transLogo from "../assets/TransLogo.png";

export function EditorPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // 3. Access Redux State (wrapped in .present due to redux-undo)
  const { config, elements, selectedIds, meta } = useAppSelector(
    (state) => state.canvas.present,
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [isProjectMgrOpen, setProjectMgrOpen] = useState(false);
  const [isDataMgrOpen, setDataMgrOpen] = useState(false); // NEW: Data Source Manager modal

  // 4. Fetch Projects on Mount + Connect Socket for live data preview
  useEffect(() => {
    loadProjects();
    socketService.connect();

    // Listen for live data updates (for preview in the Data tab)
    const handleDataUpdate = (payload: DataUpdatePayload) => {
      dispatch(setLiveData({ sourceId: payload.sourceId, data: payload.data }));
    };
    const handleDataError = (payload: DataErrorPayload) => {
      dispatch(setError({ sourceId: payload.sourceId, error: payload.error }));
    };
    const handleDataFields = (payload: { sourceId: string; fields: DataField[] }) => {
      dispatch(updateSourceFields({ sourceId: payload.sourceId, fields: payload.fields }));
    };

    socketService.on('data:update', handleDataUpdate);
    socketService.on('data:error', handleDataError);
    socketService.on('data:fields', handleDataFields);

    return () => {
      socketService.off('data:update');
      socketService.off('data:error');
      socketService.off('data:fields');
      socketService.disconnect();
    };
  }, [dispatch]);

  // Load data sources when project changes
  useEffect(() => {
    if (meta.projectId) {
      api.getDataSources(meta.projectId).then(data => {
        dispatch(setSources(data));
      }).catch(console.error);
    } else {
      dispatch(setSources([]));
    }
  }, [meta.projectId, dispatch]);

  const loadProjects = () => {
    api.getProjects().then(data => {
      setProjects(data);
    }).catch(err => console.error("Failed to load projects", err));
  };

  // 5. Handle Project Selection (Dropdown fallback)
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(setGraphicMeta({ projectId: e.target.value || null }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setGraphicMeta({ name: e.target.value }));
  };

  // 6. Handle Export / Save to DB
  const handleExport = async () => {
    let graphicName = meta.name;
    if (!graphicName || graphicName === "New Graphic") {
        const input = prompt("Enter a name for this graphic:", meta.name);
        if (!input) return;
        graphicName = input;
        dispatch(setGraphicMeta({ name: input }));
    }

    setIsSaving(true);
    try {
      // A. Compile State to HTML String
      const htmlContent = await compileGraphicToHTML(config, elements);

      // B. Send to Backend
      const result = await api.saveGraphic({
        id: meta.id,
        name: graphicName,
        html: htmlContent,
        json: { config, elements, selectedIds }, 
        projectId: meta.projectId 
      });

      if (result.status === 200 || result.data.success) {
        dispatch(setGraphicMeta({ id: result.data.id }));
        alert(`✅ Saved "${graphicName}" to ${meta.projectId ? 'Project & ' : ''}Library!`);
        
        // Refresh project list just in case
        loadProjects();
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("❌ Failed to save graphic. Check console.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-gray-300 overflow-hidden">
      
      {/* --- MODALS --- */}
      <ProjectManager 
         isOpen={isProjectMgrOpen} 
         onClose={() => {
             setProjectMgrOpen(false);
             loadProjects();
         }} 
       />
      <DataSourceManager
         isOpen={isDataMgrOpen}
         onClose={() => setDataMgrOpen(false)}
       />

      {/* --- HEADER --- */}
      <header className="h-20 bg-neutral-950 border-b border-none flex flex-col justify-center z-20">
        <div className="flex items-center w-full">

        <div className="flex items-center gap-6 px-4 py-2 w-full justify-between">  
          {/* Logo & Info */}
            <div className="flex items-center gap-4 justify-start">
              <img src={transLogo} alt="Graphyne Logo" className="w-8 h-8" />
                <span className="text-gray-400 text-xs font-normal">EDITOR</span>
              
              {/* Quick Name Edit */}
              <input 
                type="text" 
                value={meta.name} 
                onChange={handleNameChange}
                className="bg-transparent border border-transparent hover:border-fuchsia-200/30 focus:border-orange-300 text-sm px-2 py-1 rounded outline-none transition-colors"
              />
            </div>

            {/* Context & Actions */}
            <div className="flex gap-2">
              
              {/* Project Manager Button */}
              <button 
                 onClick={() => setProjectMgrOpen(true)}
                 className="flex items-center gap-2 px-3 py-1.5 bg-fuchsia-900/40 hover:bg-fuchsia-800 text-fuchsia-200 border border-fuchsia-800 rounded text-xs font-bold transition-colors mr-1"
               >
                   <FolderOpen size={14} />
                   PROJECTS
               </button>

              {/* NEW: Data Source Manager Button */}
              <button 
                 onClick={() => setDataMgrOpen(true)}
                 className="flex items-center gap-2 px-3 py-1.5 bg-orange-900/30 hover:bg-orange-800/50 text-orange-300 border border-orange-800/50 rounded text-xs font-bold transition-colors mr-2"
               >
                   <Database size={14} />
                   DATA
               </button>

              {/* Project Selector (Quick Switcher) */}
              <div className="flex items-center gap-2 mr-4">
                  <span className="text-xs text-gray-400 uppercase font-bold">Target:</span>
                  <select 
                      value={meta.projectId || ""} 
                      onChange={handleProjectChange}
                      className="bg-neutral-700/40 border border-fuchsia-200/30 text-xs rounded px-2 py-1.5 
                      focus:border-orange-300 outline-none focus:bg-neutral-700/50 focus:text-gray-800
                      hover:border-orange-300/50 max-w-[150px]"
                  >
                      <option value="">(Library Only)</option>
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
                  ${isSaving ? "bg-orange-300 text-gray-800 cursor-wait" : "bg-gray-300 hover:bg-orange-300 text-gray-800"}
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
                className="flex items-center gap-2 px-3 py-1.5 bg-transparent text-xs font-bold rounded text-gray-300 border border-fuchsia-200/30 ml-2
                hover:border-orange-300/50 focus:border-orange-300"
                onClick={() => navigate("/playout")}
              >
                <MonitorPlay size={14} /> PLAYOUT
              </button>
            </div>
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