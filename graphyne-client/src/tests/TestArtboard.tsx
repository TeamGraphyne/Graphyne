import { useSelector, useDispatch } from 'react-redux';
import { 
  addElement, 
  updateElement, 
  removeElement, 
  reorderElement, 
  selectElement 
} from '../store/canvasSlice';
import type { RootState } from '../store/store'; 
import type { CanvasElement } from '../types/canvas';

// Helper to generate a default element
const createMockElement = (type: 'rect' | 'circle'): Omit<CanvasElement, 'id'> => ({
  type,
  name: `${type}_${Date.now().toString().slice(-4)}`,
  // Random position within a 600x400 range
  x: Math.floor(Math.random() * 500),
  y: Math.floor(Math.random() * 300),
  width: 100,
  height: 100,
  rotation: 0,
  fill: type === 'rect' ? '#3b82f6' : '#ef4444', 
  stroke: '#000000',
  strokeWidth: 0,
  opacity: 1,
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  isLocked: false,
  isVisible: true,
  inAnimation: { type: 'fade', duration: 0.5, delay: 0, ease: 'power1.out' },
  outAnimation: { type: 'fade', duration: 0.5, delay: 0, ease: 'power1.in' }
});

export const TestArtboard = () => {
  const dispatch = useDispatch();
  
  // Accessing .present because of redux-undo
  const { elements, selectedIds } = useSelector((state: RootState) => state.canvas.present);
  const selectedId = selectedIds[0];

  // Actions
  const handleAdd = (type: 'rect' | 'circle') => dispatch(addElement(createMockElement(type)));
  
  const handleMoveRandom = () => {
    if (!selectedId) return;
    dispatch(updateElement({
      id: selectedId,
      props: { x: Math.random() * 500, y: Math.random() * 300 }
    }));
  };

  const handleReorder = (direction: 'up' | 'down') => {
    if (!selectedId) return;
    const currentIndex = elements.findIndex((el) => el.id === selectedId);
    if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < elements.length) {
      dispatch(reorderElement({ fromIndex: currentIndex, toIndex: newIndex }));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white font-sans">
      
      {/* 1. Header / Toolbar */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4 shadow-md z-10">
        <h1 className="text-xl font-bold text-gray-200 mr-4">Graphyne Debugger</h1>
        
        <div className="flex gap-2 border-r border-gray-600 pr-4">
          <button onClick={() => handleAdd('rect')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition">
            + Rect
          </button>
          <button onClick={() => handleAdd('circle')} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm font-medium transition">
            + Circle
          </button>
        </div>

        <div className="flex gap-2">
          <button onClick={handleMoveRandom} disabled={!selectedId} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm transition">
            Move Random
          </button>
          <button onClick={() => handleReorder('down')} disabled={!selectedId} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm transition">
            Send Back
          </button>
          <button onClick={() => handleReorder('up')} disabled={!selectedId} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm transition">
            Bring Forward
          </button>
          <button onClick={() => selectedId && dispatch(removeElement(selectedId))} disabled={!selectedId} className="px-3 py-1.5 bg-red-900 hover:bg-red-800 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm transition">
            Delete
          </button>
        </div>
      </div>

      {/* 2. Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Barebones Canvas */}
        <div className="flex-1 bg-gray-900 p-8 flex justify-center items-center overflow-auto relative">
          
          {/* The "Stage" */}
          <div 
            className="bg-white shadow-2xl relative overflow-hidden transition-all"
            style={{ width: '800px', height: '600px' }} // Fixed mock resolution
          >
            {elements.map((el) => (
              <div
                key={el.id}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(selectElement(el.id));
                }}
                style={{
                  position: 'absolute',
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  backgroundColor: el.fill,
                  borderRadius: el.type === 'circle' ? '50%' : '0%',
                  opacity: el.opacity,
                  // Visual selection indicator
                  border: selectedIds.includes(el.id) ? '4px solid #3b82f6' : '1px solid rgba(0,0,0,0.1)',
                  boxShadow: selectedIds.includes(el.id) ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out'
                }}
                className="flex justify-center items-center group"
              >
                <span className="text-black text-[10px] bg-white/80 px-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none">
                  {el.name}
                </span>
              </div>
            ))}
            
            {/* Empty State Helper */}
            {elements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none">
                Add an element to start debugging
              </div>
            )}
          </div>
        </div>

        {/* Right: Debug Data Panel */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col shadow-xl z-20">
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
              <h3 className="text-purple-400 font-bold mb-2">Full State ({elements.length} items)</h3>
              <pre className="text-gray-400 whitespace-pre-wrap break-all">
                {JSON.stringify({ selectedIds, elements: elements.map(e => ({id: e.id, type: e.type, x: Math.round(e.x), y: Math.round(e.y)})) }, null, 2)}
              </pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};