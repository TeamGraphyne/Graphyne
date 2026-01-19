import { useDispatch, useSelector } from 'react-redux';
import { Artboard } from '../components/Canvas/Artboard';
import { 
  addElement, 
  removeElement,
  updateElement 
} from '../store/canvasSlice';
import type { RootState } from '../store/store';
import type { CanvasElement } from '../types/canvas';

// Helper: Updated to match new Types
const createMockElement = (type: 'rect' | 'circle'): Omit<CanvasElement, 'id'> => ({
  type,
  name: `${type}_${Date.now().toString().slice(-4)}`,
  x: Math.floor(Math.random() * 500) + 100,
  y: Math.floor(Math.random() * 300) + 100,
  width: 100,
  height: 100,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  zIndex: 0,
  fill: type === 'rect' ? '#3b82f6' : '#ef4444', 
  stroke: '#000000',
  strokeWidth: 0,
  opacity: 1,
  isLocked: false,
  isVisible: true,
  shadow: { color: 'black', blur: 0, offsetX: 0, offsetY: 0 },
  inAnimation: { type: 'fade', duration: 0.5, delay: 0, ease: 'power1.out' },
  outAnimation: { type: 'fade', duration: 0.5, delay: 0, ease: 'power1.in' }
});

export const TestArtboard = () => {
  const dispatch = useDispatch();
  const { selectedIds, elements } = useSelector((state: RootState) => state.canvas.present);
  const selectedId = selectedIds[0];

  const handleAdd = (type: 'rect' | 'circle') => dispatch(addElement(createMockElement(type)));

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white font-sans">
      
      {/* 1. Header / Toolbar */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4 shadow-md z-10 shrink-0">
        <h1 className="text-xl font-bold text-gray-200 mr-4">Graphyne Debugger</h1>
        
        <div className="flex gap-2 border-r border-gray-600 pr-4">
          <button onClick={() => handleAdd('rect')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm transition">
            + Rect
          </button>
          <button onClick={() => handleAdd('circle')} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition">
            + Circle
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => dispatch(updateElement({ id: selectedId, props: { x: Math.random() * 500 } }))} disabled={!selectedId} className="px-3 py-1.5 bg-green-600 disabled:bg-gray-700 rounded text-sm">
            Random X
          </button>
          <button onClick={() => selectedId && dispatch(removeElement(selectedId))} disabled={!selectedId} className="px-3 py-1.5 bg-red-900 hover:bg-red-800 disabled:bg-gray-700 rounded text-sm">
            Delete
          </button>
        </div>
      </div>

      {/* 2. Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: The Actual Artboard (Production Environment) */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <Artboard />
        </div>

        {/* Right: Debug Data Panel */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col shadow-xl z-20 shrink-0">
          <div className="p-3 border-b border-gray-700 font-mono text-xs font-bold text-gray-400 uppercase">
            State Inspector
          </div>
          <div className="flex-1 overflow-auto p-4 font-mono text-xs">
            {selectedId ? (
              <div className="mb-6">
                <h3 className="text-blue-400 font-bold mb-2">Selected Element</h3>
                <pre className="text-green-300 whitespace-pre-wrap break-all">
                  {JSON.stringify(elements.find(el => el.id === selectedId), null, 2)}
                </pre>
              </div>
            ) : (
              <div className="mb-6 text-gray-500 italic">No element selected</div>
            )}
            
            <div>
              <h3 className="text-purple-400 font-bold mb-2">Selection IDs</h3>
              <pre className="text-gray-400">{JSON.stringify(selectedIds, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};