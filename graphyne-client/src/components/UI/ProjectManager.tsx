import { useState, useEffect, useRef } from 'react';
import { Folder, Plus, Trash2, FileCode, Upload, X, Image, Clock, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { loadGraphic, setGraphicMeta } from '../../store/canvasSlice';
import { parseHtmlGraphic } from '../../utils/importer';

interface ProjectManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Graphic {
    id: string;
    name: string;
    updatedAt: string;
}

export const ProjectManager = ({ isOpen, onClose }: ProjectManagerProps) => {
    const dispatch = useAppDispatch();
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedProject, setSelectedProject] = useState<{ id: string, name: string } | null>(null);
    const [graphics, setGraphics] = useState<Graphic[]>([]);
    const [isLoadingGraphics, setIsLoadingGraphics] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadProjects();
        } else {
            setSelectedProject(null);
            setGraphics([]);
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

    const loadGraphicsForProject = async (projectId: string) => {
        setIsLoadingGraphics(true);
        setGraphics([]);
        try {
            const data = await api.getGraphics(projectId);
            setGraphics(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingGraphics(false);
        }
    };

    const handleCreate = async () => {
        if (!newProjectName.trim()) return;
        try {
            const newProj = await api.createProject(newProjectName);
            setProjects([...projects, newProj]);
            setNewProjectName("");
            handleSelectProject(newProj.id, newProj.name);
        } catch (error) {
            alert("Failed to create project: " + error);
        }
    };

    const handleSelectProject = (id: string, name: string) => {
        setSelectedProject({ id, name });
        loadGraphicsForProject(id);
        dispatch(setGraphicMeta({ projectId: id }));
    };

    const handleLoadGraphic = async (graphic: Graphic) => {
        try {
            const data = await api.getGraphic(graphic.id);
            const state = data.json || JSON.parse(data.rawJson);

            dispatch(loadGraphic({
                id: data.id,
                name: data.name,
                elements: state.elements || [],
                config: state.config,
            }));
            dispatch(setGraphicMeta({
                projectId: selectedProject!.id,
                id: data.id,
                name: data.name,
            }));
            onClose();
        } catch (error) {
            alert("Failed to load graphic: " + error);
        }
    };

    const handleNewGraphic = () => {
        dispatch(loadGraphic({
            id: null,
            name: 'New Graphic',
            elements: [],
            config: { width: 1920, height: 1080, background: '#000000' },
        }));
        dispatch(setGraphicMeta({
            projectId: selectedProject?.id ?? null,
            id: null,
            name: 'New Graphic',
        }));
        onClose();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        parseHtmlGraphic(file).then((state) => {
            dispatch(loadGraphic({
                id: null,
                name: file.name.replace('.html', ''),
                elements: state.elements,
                config: state.config,
            }));
            dispatch(setGraphicMeta({
                name: file.name.replace('.html', ''),
                id: null,
            }));
            onClose();
        }).catch(err => alert(err));
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className={`bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${selectedProject ? 'w-240' : 'w-170'} h-140`}>

                {/* Header */}
                <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-950 shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Folder className="text-fuchsia-500" /> Project Manager
                        {selectedProject && (
                            <span className="flex items-center gap-1 text-neutral-400 font-normal text-base">
                                <ChevronRight size={16} />
                                <span className="text-fuchsia-400">{selectedProject.name}</span>
                            </span>
                        )}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-txt">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">

                    {/* Column 1: Project List */}
                    {/* MODIFIED: Added transition-all and conditional flex-1 so it splits space evenly with the actions column initially */}
                    <div className={`border-r border-neutral-800 p-4 flex flex-col gap-3 bg-neutral-900 transition-all ${selectedProject ? 'w-56 shrink-0' : 'flex-1'}`}>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-sm text-white placeholder-neutral-500 focus:border-fuchsia-500 outline-none min-w-0"
                                placeholder="New project..."
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            />
                            <button
                                onClick={handleCreate}
                                disabled={!newProjectName}
                                className="bg-btn hover:bg-select text-tab px-4 rounded disabled:opacity-50"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1">
                            {isLoading ? (
                                <p className="text-neutral-500 text-sm px-1">Loading...</p>
                            ) : projects.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelectProject(p.id, p.name)}
                                    className={`group flex items-center justify-between p-2.5 rounded cursor-pointer transition-colors border ${
                                        selectedProject?.id === p.id
                                            ? 'bg-fuchsia-950/60 border-fuchsia-700/50 text-fuchsia-300'
                                            : 'bg-neutral-800 hover:bg-neutral-700 border-transparent hover:border-neutral-600 text-gray-200'
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">{p.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{p.id.substring(0, 6)}...</div>
                                    </div>
                                    <button
                                        className="text-neutral-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 shrink-0"
                                        onClick={e => {
                                            e.stopPropagation();
                                            api.deleteProject(p.id).then(loadProjects);
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Graphics Panel */}
                    {selectedProject && (
                        <div className="flex-1 border-r border-neutral-800 flex flex-col bg-neutral-900/80 min-w-0">
                            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
                                <span className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                                    <Image size={14} className="text-fuchsia-400" />
                                    Graphics in this project
                                </span>
                                <span className="text-xs text-neutral-500">
                                    {graphics.length} file{graphics.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {isLoadingGraphics ? (
                                    <div className="flex items-center justify-center h-24 text-neutral-500 text-sm">
                                        Loading graphics...
                                    </div>
                                ) : graphics.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-24 gap-2 text-neutral-500">
                                        <Image size={24} className="opacity-30" />
                                        <span className="text-sm">No graphics yet</span>
                                    </div>
                                ) : graphics.map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => handleLoadGraphic(g)}
                                        className="w-full flex items-center gap-3 p-3 rounded bg-neutral-800 hover:bg-neutral-700 border border-transparent hover:border-fuchsia-700/40 text-left transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center shrink-0">
                                            <FileCode size={14} className="text-fuchsia-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-gray-200 truncate">{g.name}</div>
                                            <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                                                <Clock size={10} />
                                                {formatDate(g.updatedAt)}
                                            </div>
                                        </div>
                                        <span className="text-xs text-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            Open →
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Column 3: Actions */}
                    <div className={`p-6 flex flex-col justify-center items-center gap-6 bg-neutral-900/50 transition-all ${selectedProject ? 'w-64 shrink-0' : 'flex-1'}`}>
                        <div className="text-center space-y-1">
                            <h3 className="text-base font-bold text-white">Actions</h3>
                            <p className="text-xs text-neutral-400 px-2 truncate">
                                {selectedProject ? `In "${selectedProject.name}"` : 'Select a project first'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 w-full max-w-65">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".html"
                                onChange={handleImport}
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center gap-3 p-3.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white transition-all hover:scale-105 group"
                            >
                                <Upload size={20} className="text-blue-400 shrink-0 group-hover:-translate-y-0.5 transition-transform" />
                                <div className="text-left flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate">Import HTML</div>
                                    <div className="text-xs text-neutral-400 mt-0.5 truncate">Open from disk</div>
                                </div>
                            </button>

                            <button
                                onClick={handleNewGraphic}
                                className="w-full flex items-center gap-3 p-3.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded-lg text-white transition-all hover:scale-105 group"
                            >
                                <FileCode size={20} className="text-green-400 shrink-0 group-hover:scale-110 transition-transform" />
                                <div className="text-left flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate">New Graphic</div>
                                    <div className="text-xs text-neutral-400 mt-0.5 truncate">Start from scratch</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};