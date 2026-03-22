import { useState, useEffect, useRef } from 'react';
import { Folder, Plus, Trash2, FileCode, Upload, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { loadGraphic, setGraphicMeta } from '../../store/canvasSlice';
import { parseHtmlGraphic } from '../../utils/importer';

interface ProjectManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectManager = ({ isOpen, onClose }: ProjectManagerProps) => {
    const dispatch = useAppDispatch();
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Fetch Projects when opened
    useEffect(() => {
        if (isOpen) {
            loadProjects();
        }
    }, [isOpen]);

    const loadProjects = async () => {
        setIsLoading(true);
        try {
            const data = await api.getProjects();
            setProjects(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Create New Project
    const handleCreate = async () => {
        if (!newProjectName.trim()) return;
        try {
            const newProj = await api.createProject(newProjectName);
            setProjects([...projects, newProj]);
            setNewProjectName("");
            
            // Auto-select the new project
            handleSelectProject(newProj.id, newProj.name);
        } catch (error) {
            alert("Failed to create project: " + error);
        }
    };

    // 3. Select Project (Connects Editor to this Project ID)
    const handleSelectProject = (id: string, name: string) => {
        dispatch(setGraphicMeta({ projectId: id }));
        alert(`Switched to Project: ${name}`);
        onClose();
    };

    // 4. Import HTML File to Editor (Open from Disk)
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        parseHtmlGraphic(file).then((state) => {
            dispatch(loadGraphic({
                id: '', // New ID (it's a copy)
                name: file.name.replace('.html', ''),
                elements: state.elements,
                config: state.config
            }));
            dispatch(setGraphicMeta({ name: file.name.replace('.html', '') }));
            onClose();
        }).catch(err => alert(err));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blur backdrop-blur-sm">
            <div className="w-200 h-150 bg-tab border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-tab">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Folder className="text-btn" /> Project Manager
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-txt">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    
                    {/* Sidebar: Project List */}
                    <div className="w-1/2 border-r border-border p-6 flex flex-col gap-4 bg-bg">
                        <div className="flex gap-2">
                            <input 
                                className="flex-1 bg-tab border border-border rounded px-3 py-2 text-txt placeholder-txtDisabled focus:border-select outline-none hover:border-hover"
                                placeholder="New Project Name..."
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                            />
                            <button 
                                onClick={handleCreate}
                                disabled={!newProjectName}
                                className="bg-btn hover:bg-select text-tab px-4 rounded disabled:opacity-50"
                            >
                                <Plus />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
                            {isLoading ? <p className="text-txtDisbaled">Loading...</p> : projects.map(p => (
                                <div key={p.id} className="group flex items-center justify-between p-3 rounded bg- hover:bg-neutral-700 transition-colors border border-transparent hover:border-hover">
                                    <div className="flex-1 cursor-pointer" onClick={() => handleSelectProject(p.id, p.name)}>
                                        <div className="font-bold text-txt">{p.name}</div>
                                        <div className="text-xs text-txtDisabled font-mono">{p.id.substring(0,6)}...</div>
                                    </div>
                                    <button 
                                        className="text-txtDisabled hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                        onClick={() => api.deleteProject(p.id).then(loadProjects)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Side: Actions */}
                    <div className="w-1/2 p-8 flex flex-col justify-center items-center gap-6 bg-neutral-900/50">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-txt">Editor Actions</h3>
                            <p className="text-txt">Import files or start fresh</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".html"
                                onChange={handleImport}
                             />
                            
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-center gap-3 p-4 bg-tab hover:bg-hover border border-border rounded-lg text-txt hover:text-txtSelect transition-all hover:scale-105 hover:border-select"
                            >
                                <Upload size={24} className="text-txtSelect" />
                                <div className="text-left">
                                    <div className="font-bold">Import HTML Graphic</div>
                                    <div className="text-xs text-txtSelect">Open existing file from disk</div>
                                </div>
                            </button>

                            <button 
                                onClick={() => {
                                    dispatch(loadGraphic({ 
                                        id: '', name: 'New Graphic', 
                                        elements: [], 
                                        config: { width: 1920, height: 1080, background: '#000000' } 
                                    }));
                                    onClose();
                                }}
                                className="flex items-center justify-center gap-3 p-4 bg-tab hover:bg-hover border border-border rounded-lg text-txt hover:text-txtSelect hover:border-select transition-all hover:scale-105"
                            >
                                <FileCode size={24} className="text-txtSelect" />
                                <div className="text-left">
                                    <div className="font-bold">New Blank Graphic</div>
                                    <div className="text-xs text-txtSelect">Start from scratch</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};