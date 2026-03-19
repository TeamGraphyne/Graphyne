import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  ChevronUp, ChevronDown, Eye, EyeOff, Lock, Unlock, Trash2, GripVertical, Edit2, Check, X
} from 'lucide-react';

import {
  moveLayerUp,
  moveLayerDown,
  toggleVisibility,
  toggleLock,
  removeElement,
  reorderElement,
  selectElement,
  renameElement
} from '../../store/canvasSlice';

export const LayersPanel = () => {
  const dispatch = useAppDispatch();

  // Handles redux-undo
  const elements = useAppSelector((state) => 
    state.canvas.present ? state.canvas.present.elements : []
  );

  const selectedIds = useAppSelector((state) => 
    state.canvas.present ? state.canvas.present.selectedIds : []
  );

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Renaming state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const reversedLength = elements.length - 1;
      const fromIndex = reversedLength - draggedIndex;
      const toIndex = reversedLength - dropIndex;
      
      dispatch(reorderElement({ fromIndex, toIndex }));
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleLayerClick = (id: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    dispatch(selectElement(id));
  };

  // Renaming handlers
  const startEditing = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveRename = () => {
    if (editingId && editingName.trim()) {
      dispatch(renameElement({ id: editingId, name: editingName.trim() }));
    }
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveRename();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  return (
    <div className="w-80 bg-panel border-r border-border p-3 h-full flex flex-col">
      <h3 className="text-[14px] text-txt mb-3 font-bold uppercase tracking-wider">Layers</h3>

      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {[...elements].reverse().map((el, index) => {
            const isSelected = selectedIds.includes(el.id);
            const isDragging = draggedIndex === index;
            const isOver = dragOverIndex === index;
            const isEditing = editingId === el.id;

            return (
              <div
                key={el.id}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleLayerClick(el.id, e)}
                className={`
                    flex items-center justify-between p-2 rounded transition-all group border
                    ${isDragging ? 'opacity-50 dashed border-border' : ''}
                    ${isOver ? 'border-t-2 border-t-select' : ''}
                    ${isSelected 
                        ? 'bg-btnSelect border-border shadow-md ring-1 ring-border' 
                        : 'bg-btnUnfocused border-transparent hover:bg-btnHover'
                    }
                `}
              >
                {/* Layer Name + Drag Handle */}
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    {!isEditing && (
                      <div className="cursor-grab active:cursor-grabbing text-txt hover:text-txtHover">
                        <GripVertical size={14} />
                      </div>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          ref={inputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={saveRename}
                          className="flex-1 px-2 py-1 text-[14px] bg-panel border border-border rounded text-txt focus:outline-none focus:ring-1 focus:ring-border"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveRename();
                          }}
                          className="p-1 hover:bg-green-600/50 rounded transition-colors"
                          title="Save"
                        >
                          <Check size={14} className="text-green-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                          className="p-1 hover:bg-red-600/50 rounded transition-colors"
                          title="Cancel"
                        >
                          <X size={14} className="text-red-400" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 overflow-hidden">
                        <span className={`text-sm truncate select-none ${isSelected ? 'text-txtSelect font-medium' : 'text-txt'}`}>
                          {el.name}
                        </span>
                        <button
                          onClick={(e) => startEditing(el.id, el.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 group/button hover:bg-select rounded transition-opacity"
                          title="Rename Layer"
                        >
                          <Edit2 size={12} className="text-txtHover group-hover/button:text-btnDark" />
                        </button>
                      </div>
                    )}
                </div>

                {/* Controls - Only show when not editing */}
                {!isEditing && (
                  <div className={`flex items-center space-x-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-100 sm:opacity-60 sm:group-hover:opacity-100'}`}>
                    <button onClick={() => dispatch(toggleVisibility(el.id))} title={el.isVisible ? 'Hide' : 'Show'} className="group/button p-1 hover:bg-select rounded">
                      {el.isVisible ? <Eye size={14} className="text-txtSelect group-hover/button:text-btnDark" /> : <EyeOff size={14} className="text-txtSelect group-hover/button:text-btnDark" />}
                    </button>

                    <button onClick={() => dispatch(toggleLock(el.id))} title={el.isLocked ? 'Unlock' : 'Lock'} className="group/button p-1 hover:bg-select rounded">
                      {el.isLocked ? <Lock size={14} className="text-txtSelect group-hover/button:text-btnDark" /> : <Unlock size={14} className="text-txtSelect group-hover/button:text-btnDark" />}
                    </button>

                    <button onClick={() => dispatch(moveLayerUp(el.id))} title="Move Up" className="group/button p-1 hover:bg-select rounded">
                      <ChevronUp size={14} className="text-txtSelect group-hover/button:text-btnDark" />
                    </button>

                    <button onClick={() => dispatch(moveLayerDown(el.id))} title="Move Down" className="group/button p-1 hover:bg-select rounded">
                      <ChevronDown size={14} className="text-txtSelect group-hover/button:text-btnDark" />
                    </button>
                    
                    <button onClick={() => dispatch(removeElement(el.id))} title="Delete" className="group/button p-1 hover:bg-red-900/50 rounded text-red-600">
                      <Trash2 size={14} className="group-hover/button:text-red-300"/>
                    </button>
                  </div>
                )}
              </div>
            );
        })}
      </div>
    </div>
  );
};