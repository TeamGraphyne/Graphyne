import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  moveLayerUp,
  moveLayerDown
} from '../../store/canvasSlice';

import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2
} from 'lucide-react';

import {
  toggleVisibility,
  toggleLock,
  removeElement,
} from '../../store/canvasSlice';


export const LayersPanel = () => {
  const dispatch = useDispatch();

  const elements = useSelector(
  (state: any) =>
    state.canvas.present?.elements || state.canvas.elements
);


  return (
    <div className="w-64 bg-panel border-l border-gray-700 p-3">
      <h3 className="text-sm text-gray-300 mb-3">Layers</h3>

      <div className="space-y-2">
        {elements.map((el: any) => (
          <div
            key={el.id}
            className="flex items-center justify-between p-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            {/* Layer name */}
            <span className="text-white text-sm truncate">
              {el.name}
            </span>

            {/* Controls */}
            <div className="flex items-center space-x-2">

              {/* Visibility */}
              <button
                onClick={() => dispatch(toggleVisibility(el.id))}
                title={el.isVisible ? 'Hide' : 'Show'}
              >
                {el.isVisible ? (
                  <Eye size={16} className="text-gray-300" />
                ) : (
                  <EyeOff size={16} className="text-gray-400" />
                )}
              </button>

              {/* Lock */}
              <button
                onClick={() => dispatch(toggleLock(el.id))}
                title={el.isLocked ? 'Unlock' : 'Lock'}
              >
                {el.isLocked ? (
                  <Lock size={16} className="text-yellow-400" />
                ) : (
                  <Unlock size={16} className="text-gray-300" />
                )}
              </button>

              {/* Delete */}
              <button
                onClick={() => dispatch(removeElement(el.id))}

                title="Delete"
              >
                <Trash2
                  size={16}
                  className="text-red-400 hover:text-red-500"
                />
              </button>

              {/* Move Up */}
                <button
                onClick={() => dispatch(moveLayerUp(el.id))}
                title="Move Up"
                >
                <ChevronUp size={16} className="text-gray-300" />
                </button>

                {/* Move Down */}
                <button
                onClick={() => dispatch(moveLayerDown(el.id))}
                title="Move Down"
                >
                <ChevronDown size={16} className="text-gray-300" />
                </button>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
