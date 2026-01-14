import { useAppSelector, useAppDispatch } from '../../../stores/hooks';
import { updateLayer } from '../stores/editorSlice';

export function PropertiesPanel() {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((state) => state.editor.selectedLayerId);
  // Find the actual object in the array
  const selectedLayer = useAppSelector((state) => 
    state.editor.layers.find(l => l.id === selectedId)
  );

  if (!selectedLayer) {
    return <div className="w-64 bg-gray-900 p-4 text-gray-500">No selection</div>;
  }

  return (
    <div className="w-64 bg-gray-900 p-4 border-l border-gray-800 flex flex-col gap-4">
      <h3 className="text-white font-bold mb-2">Properties</h3>

      {/* Common: X / Y Positions */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">X Position</label>
          <input 
            type="number" 
            value={Math.round(selectedLayer.x)}
            onChange={(e) => dispatch(updateLayer({ id: selectedLayer.id, x: Number(e.target.value) }))}
            className="w-full bg-gray-800 text-white p-1 rounded"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Y Position</label>
          <input 
            type="number" 
            value={Math.round(selectedLayer.y)}
            onChange={(e) => dispatch(updateLayer({ id: selectedLayer.id, y: Number(e.target.value) }))}
            className="w-full bg-gray-800 text-white p-1 rounded"
          />
        </div>
      </div>

      {/* Common: Color Picker */}
      <div>
        <label className="text-xs text-gray-400">Fill Color</label>
        <div className="flex gap-2">
          <input 
            type="color" 
            value={selectedLayer.fill}
            onChange={(e) => dispatch(updateLayer({ id: selectedLayer.id, fill: e.target.value }))}
            className="h-8 w-8 cursor-pointer"
          />
          <input 
            type="text"
            value={selectedLayer.fill}
            onChange={(e) => dispatch(updateLayer({ id: selectedLayer.id, fill: e.target.value }))} 
            className="flex-1 bg-gray-800 text-white p-1 rounded"
          />
        </div>
      </div>

      {/* Text Specific: Content */}
      {selectedLayer.type === 'text' && (
        <div>
          <label className="text-xs text-gray-400">Text Content</label>
          <textarea 
            value={selectedLayer.text}
            onChange={(e) => dispatch(updateLayer({ id: selectedLayer.id, text: e.target.value }))}
            className="w-full bg-gray-800 text-white p-2 rounded h-24"
          />
        </div>
      )}
    </div>
  );
}