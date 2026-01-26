import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  ChevronUp, ChevronDown, Eye, EyeOff, Lock, Unlock, Trash2, GripVertical
} from 'lucide-react';

import {
  moveLayerUp,
  moveLayerDown,
  toggleVisibility,
  toggleLock,
  removeElement,
  reorderElement,
  selectElement
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: Hide the default ghost image if you want custom styling
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary to allow dropping
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
      // Convert visual index to actual array index (since we display reversed)
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
    // Don't select if clicking on control buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    dispatch(selectElement(id));
  };

  return (
    <div className="w-80 bg-fuchsia-950/40 border-r border-fuchsia-200/30 p-3 h-full flex flex-col">
      <h3 className="text-[14px] text-xs text-gray-400 mb-3 font-bold uppercase tracking-wider">Layers</h3>

      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {/* Render in reverse order so top layer is at top of list */}
        {[...elements].reverse().map((el, index) => {
            const isSelected = selectedIds.includes(el.id);
            const isDragging = draggedIndex === index;
            const isOver = dragOverIndex === index;

            return (
              <div
                key={el.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={(e) => handleLayerClick(el.id, e)}
                className={`
                    flex items-center justify-between p-2 rounded transition-all group border
                    ${isDragging ? 'opacity-50 dashed border-fuchsia-400' : ''}
                    ${isOver ? 'border-t-2 border-t-fuchsia-400' : ''}
                    ${isSelected 
                        ? 'bg-fuchsia-900/80 border-fuchsia-500/50 shadow-md ring-1 ring-fuchsia-500/30' 
                        : 'bg-fuchsia-950/50 border-transparent hover:bg-fuchsia-900/50'
                    }
                `}
              >
                {/* Layer Name + Drag Handle */}
                <div className="flex items-center gap-2 flex-1 overflow-hidden">
                    <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300">
                        <GripVertical size={14} />
                    </div>
                    <span className={`text-sm truncate select-none ${isSelected ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>
                        {el.name}
                    </span>
                </div>

                {/* Controls - Only show on hover or if active/selected */}
                <div className={`flex items-center space-x-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-100 sm:opacity-60 sm:group-hover:opacity-100'}`}>
                  <button onClick={() => dispatch(toggleVisibility(el.id))} title={el.isVisible ? 'Hide' : 'Show'} className="group/button p-1 hover:bg-orange-300 rounded">
                    {el.isVisible ? <Eye size={14} className="text-gray-300 group-hover/button:text-gray-800" /> : <EyeOff size={14} className="text-gray-300 group-hover/button:text-gray-800" />}
                  </button>

                  <button onClick={() => dispatch(toggleLock(el.id))} title={el.isLocked ? 'Unlock' : 'Lock'} className="group/button p-1 hover:bg-orange-300 rounded">
                    {el.isLocked ? <Lock size={14} className="text-gray-300 group-hover/button:text-gray-800" /> : <Unlock size={14} className="text-gray-300 group-hover/button:text-gray-800" />}
                  </button>

                  <button onClick={() => dispatch(moveLayerUp(el.id))} title="Move Up" className="group/button p-1 hover:bg-orange-300 rounded">
                    <ChevronUp size={14} className="text-gray-300 group-hover/button:text-gray-800" />
                  </button>

                  <button onClick={() => dispatch(moveLayerDown(el.id))} title="Move Down" className="group/button p-1 hover:bg-orange-300 rounded">
                    <ChevronDown size={14} className="text-gray-300 group-hover/button:text-gray-800" />
                  </button>
                  
                  <button onClick={() => dispatch(removeElement(el.id))} title="Delete" className="group/button p-1 hover:bg-red-900/50 rounded text-red-600">
                    <Trash2 size={14} className="group-hover/button:text-red-300"/>
                  </button>

                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};