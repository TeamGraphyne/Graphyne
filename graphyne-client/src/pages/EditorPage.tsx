import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MonitorPlay, Loader2, Save, FolderOpen, Database, Sparkles} from "lucide-react";

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

import { AiDesignPanel } from "../components/UI/AiDesignPanel";

import transLogo from "../assets/TransLogo.png";
import HotkeyManager from "../components/UI/HotkeyManager";

export function EditorPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isHotkeyMgrOpen, setHotkeyMgrOpen] = useState(false);

  // 3. Access Redux State (wrapped in .present due to redux-undo)
  const { config, elements, selectedIds, meta } = useAppSelector(
    (state) => state.canvas.present,
  );
  
  const [isSaving, setIsSaving] = useState(false);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [isProjectMgrOpen, setProjectMgrOpen] = useState(false);
  const [isDataMgrOpen, setDataMgrOpen] = useState(false); // NEW: Data Source Manager modal
  const [isAiPanelOpen, setAiPanelOpen] = useState(false);



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

  // Load data sources when project changes + persist selection to localStorage
  useEffect(() => {
    if (meta.projectId) {
      localStorage.setItem('graphyne:activeProjectId', meta.projectId);
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

      let result;

      // FIXED: Use correct API calls based on whether we are updating or creating
      if (meta.id) {
        result = await api.updateGraphic(meta.id, {
          name: graphicName,
          html: htmlContent,
          json: { config, elements, selectedIds }
        });
      } else {
        result = await api.createGraphic({
          name: graphicName,
          html: htmlContent,
          json: { config, elements, selectedIds }, 
          projectId: meta.projectId 
        });
      }

      // FIXED: Only check result.success since response.data is directly returned by API utility
      if (result.success) {
        dispatch(setGraphicMeta({ id: result.id }));
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
    <div className="h-screen flex flex-col bg-tab text-txt overflow-hidden">
      
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

      <AiDesignPanel
        isOpen={isAiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
      />

      <HotkeyManager
      isOpen={isHotkeyMgrOpen}
      onClose={() => setHotkeyMgrOpen(false)}
     />

      {/* --- HEADER --- */}
      <header className="h-20 bg-tab border-b border-none flex flex-col justify-center z-20">
        <div className="flex items-center w-full">

        <div className="flex items-center gap-6 px-4 py-2 w-full justify-between">  
          {/* Logo & Info */}
            <div className="flex items-center gap-4 justify-start">
              <img src={transLogo} alt="Graphyne Logo" className="w-8 h-8" />
                <span className="text-txt text-xs font-normal">EDITOR</span>
              
              {/* Quick Name Edit */}
              <input 
                type="text" 
                value={meta.name} 
                onChange={handleNameChange}
                className="bg-transparent border border-transparent hover:border-border focus:border-orange-300 text-sm px-2 py-1 rounded outline-none transition-colors"
              />
            </div>

            {/* Context & Actions */}
            <div className="flex gap-2">

              {/* NEW: AI Generate Button */}
              <button
                onClick={() => setAiPanelOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5
                           bg-linear-to-r from-lgPurpDis to-lgPurpDis
                           hover:from-logoOrange hover:to-logoPurple
                           text-txt border border-select
                           hover:border-orange-400/60 rounded text-xs font-bold transition-all hover:text-txtSelect"
              >
                <Sparkles size={14} />
                AI DESIGN
              </button>
              
              {/* Project Manager Button */}
              <button 
                 onClick={() => setProjectMgrOpen(true)}
                 className="flex items-center gap-2 px-3 py-1.5 bg-none text-txt border border-border rounded text-xs font-bold transition-colors mr-1
                            hover:bg-none hover:border-select hover:text-txtSelect"
               >
                   <FolderOpen size={14} />
                   PROJECTS
               </button>

               <button
                onClick={() => setHotkeyMgrOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/30 hover:bg-indigo-800/50 text-indigo-300 border border-indigo-800/50 rounded text-xs font-bold transition-colors"
              >

                  <FolderOpen size={14} />
                    HOTKEYS
                  </button>

              {/* NEW: Data Source Manager Button */}
              <button 
                 onClick={() => setDataMgrOpen(true)}
                 className="flex items-center gap-2 px-3 py-1.5 bg-none text-txt border border-border rounded text-xs font-bold transition-colors mr-2
                            hover:bg-none hover:text-txtSelect hover:border-select"
               >
                   <Database size={14} />
                   DATA
               </button>

              {/* Project Selector (Quick Switcher) */}
              <div className="flex items-center gap-2 mr-4">
                  <span className="text-xs text-txt uppercase font-bold">Target:</span>
                  <select 
                      value={meta.projectId || ""} 
                      onChange={handleProjectChange}
                      className="bg-tab border border-border text-xs rounded px-2 py-1.5 
                                  outline-none focus:text-txtSelect focus:border-select
                                hover:border-hover max-w-37.5"
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
                  ${isSaving ? "bg-hover text-txt2 cursor-wait" : "bg-btn hover:bg-select text-txt2"}
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
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded text-txt2 border border-none bg-select ml-2
                hover:bg-btn focus:bg-btn"
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
        <div className="flex-1 bg-tab relative overflow-hidden flex flex-col">
          <div className="flex-1 flex items-center justify-center overflow-auto p-8">
            <div className="shadow-2xl shadow-black/50">
              <Artboard />
            </div>
          </div>
        </div>

        {/* Right: Properties */}
        <div className="w-80 bg-tab flex flex-col z-10">
          <div className="flex border-b border-border"></div>
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}



