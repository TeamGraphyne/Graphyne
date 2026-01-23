import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  ChevronUp, ChevronDown, Eye, EyeOff, Lock, Unlock, Trash2 
} from 'lucide-react';

import {
  moveLayerUp,
  moveLayerDown,
  toggleVisibility,
  toggleLock,
  removeElement,
} from '../../store/canvasSlice';

export const LayersPanel = () => {
  const dispatch = useAppDispatch();

  //  Handles redux-undo
  const elements = useAppSelector((state) => 
    state.canvas.present ? state.canvas.present.elements : []
  );

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 p-3 h-full flex flex-col">
      <h3 className="text-sm text-gray-300 mb-3 font-bold uppercase tracking-wider">Layers</h3>

      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {/* Render in reverse order so top layer is at top of list */}
        {[...elements].reverse().map((el) => (
          <div
            key={el.id}
            className="flex items-center justify-between p-2 bg-gray-900 rounded hover:bg-gray-800 transition-colors group"
          >
            {/* Layer name */}
            <span className="text-gray-200 text-sm truncate flex-1">
              {el.name}
            </span>

            {/* Controls - Only show on hover or if active */}
            <div className="flex items-center space-x-1 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
              
              <button onClick={() => dispatch(toggleVisibility(el.id))} title={el.isVisible ? 'Hide' : 'Show'} className="p-1 hover:bg-gray-600 rounded">
                {el.isVisible ? <Eye size={14} className="text-gray-400" /> : <EyeOff size={14} className="text-gray-500" />}
              </button>

              <button onClick={() => dispatch(toggleLock(el.id))} title={el.isLocked ? 'Unlock' : 'Lock'} className="p-1 hover:bg-gray-600 rounded">
                {el.isLocked ? <Lock size={14} className="text-yellow-500" /> : <Unlock size={14} className="text-gray-400" />}
              </button>

              <button onClick={() => dispatch(moveLayerUp(el.id))} title="Move Up" className="p-1 hover:bg-gray-600 rounded">
                <ChevronUp size={14} className="text-gray-300" />
              </button>

              <button onClick={() => dispatch(moveLayerDown(el.id))} title="Move Down" className="p-1 hover:bg-gray-600 rounded">
                <ChevronDown size={14} className="text-gray-300" />
              </button>
              
              <button onClick={() => dispatch(removeElement(el.id))} title="Delete" className="p-1 hover:bg-red-900/50 rounded text-red-400">
                <Trash2 size={14} />
              </button>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};