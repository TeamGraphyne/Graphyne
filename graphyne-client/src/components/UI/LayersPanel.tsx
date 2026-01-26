import { useState } from 'react';
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
    <div className="w-80 bg-gray-900 border-r border-gray-800 p-3 h-full flex flex-col">
      <h3 className="text-sm text-gray-300 mb-3 font-bold uppercase tracking-wider">Layers</h3>

      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {/* Render in reverse order so top layer is at top of list */}
        {[...elements].reverse().map((el, visualIndex) => {
          const isSelected = selectedIds.includes(el.id);
          const isDragging = draggedIndex === visualIndex;
          const isDragOver = dragOverIndex === visualIndex;
          
          return (
            <div
              key={el.id}
              draggable
              onDragStart={(e) => handleDragStart(e, visualIndex)}
              onDragOver={(e) => handleDragOver(e, visualIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, visualIndex)}
              onDragEnd={handleDragEnd}
              onClick={(e) => handleLayerClick(el.id, e)}
              className={`
                flex items-center justify-between p-2 rounded transition-all cursor-pointer group
                ${isSelected ? 'bg-blue-900/40 border border-blue-500' : 'bg-gray-800 hover:bg-gray-700'}
                ${isDragging ? 'opacity-50' : 'opacity-100'}
                ${isDragOver ? 'border-t-2 border-blue-400' : ''}
              `}
            >
              {/* Drag handle */}
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <GripVertical 
                  size={16} 
                  className="text-gray-500 flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" 
                />
                
                {/* Layer name */}
                <span className="text-gray-200 text-sm truncate">
                  {el.name}
                </span>
              </div>

              {/* Controls - Only show on hover or if active */}
              <div className="flex items-center space-x-1 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(toggleVisibility(el.id));
                  }} 
                  title={el.isVisible ? 'Hide' : 'Show'} 
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  {el.isVisible ? 
                    <Eye size={14} className="text-gray-400" /> : 
                    <EyeOff size={14} className="text-gray-500" />
                  }
                </button>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(toggleLock(el.id));
                  }} 
                  title={el.isLocked ? 'Unlock' : 'Lock'} 
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  {el.isLocked ? 
                    <Lock size={14} className="text-yellow-500" /> : 
                    <Unlock size={14} className="text-gray-400" />
                  }
                </button>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(moveLayerUp(el.id));
                  }} 
                  title="Move Up" 
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  <ChevronUp size={14} className="text-gray-300" />
                </button>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(moveLayerDown(el.id));
                  }} 
                  title="Move Down" 
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  <ChevronDown size={14} className="text-gray-300" />
                </button>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(removeElement(el.id));
                  }} 
                  title="Delete" 
                  className="p-1 hover:bg-red-900/50 rounded text-red-400"
                >
                  <Trash2 size={14} />
                </button>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};