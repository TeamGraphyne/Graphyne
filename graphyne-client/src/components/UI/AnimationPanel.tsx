import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateElement } from '../../store/canvasSlice';
import gsap from 'gsap';
import Konva from 'konva';

interface KonvaWindow extends Window {
  Konva?: {
    stages: Konva.Stage[];
  }
}

export const AnimationPanel = () => {
  const dispatch = useAppDispatch();
  
  // 3. Select from 'present' due to redux-undo
  const selectedId = useAppSelector((state) => state.canvas.present.selectedIds[0]);
  const element = useAppSelector((state) => 
    state.canvas.present.elements.find((el) => el.id === selectedId)
  );

  if (!element) return <div className="p-4 text-gray-400 text-sm">Select an object to animate</div>;

  // 4. FIX: Flatten payload to match canvasSlice.ts
  const updateAnim = (phase: 'inAnimation' | 'outAnimation', key: string, val: string | number) => {
    // Ensure the animation object exists before spreading, or provide default
    const currentAnim = element[phase] || { type: 'none', duration: 0.5, delay: 0 };
    
    dispatch(updateElement({
      id: element.id,
      [phase]: { 
        ...currentAnim, 
        [key]: val 
      }
    }));
  };

  // 5. Preview Logic (Safe Mode)
  const handlePreview = () => {
    // We check if Konva is attached to window
const kWindow = window as unknown as KonvaWindow;
    const stage = kWindow.Konva?.stages?.[0];

    if (!stage) {
      console.warn("Preview unavailable: Konva stage not found on window");
      return;
    }

    const node = stage.findOne('#' + element.id);
    
    if (node) {
      // Kill active tweens to prevent conflict
      gsap.killTweensOf(node);

      // Reset to initial state based on animation type
      const animType = element.inAnimation?.type || 'none';
      const duration = element.inAnimation?.duration || 0.5;

      if (animType === 'fade') {
        node.opacity(0);
        gsap.to(node, { opacity: element.opacity ?? 1, duration });
      } else if (animType === 'slide-left') {
        node.x((element.x) - 100); 
        gsap.to(node, { x: element.x, opacity: element.opacity ?? 1, duration });
      } else if (animType === 'slide-right') {
        node.x((element.x) + 100); 
        gsap.to(node, { x: element.x, opacity: element.opacity ?? 1, duration });
      }
    }
  };

  return (
    <div className="p-4 text-grey-400 bg-gray-920 border-r border-none h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">In Animation</h3>
        <button 
          onClick={handlePreview}
          className="group bg-fuchsia-900/50 px-2 py-1 rounded
          hover:bg-orange-300 
          focus:bg-orange-300
          transition-colors"
        >
          <svg  className="w-6 h-6 text-gray-300 group-hover:text-gray-800 group-focus:text-gray-800 transition-colors" 
                aria-hidden="true" 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" height="24" 
                fill="currentColor" 
                viewBox="0 0 24 24"
          >
            <path fill-rule="evenodd" d="M8.6 5.2A1 1 0 0 0 7 6v12a1 1 0 0 0 1.6.8l8-6a1 1 0 0 0 0-1.6l-8-6Z" clip-rule="evenodd"/>
          </svg>

        </button>
      </div>
      
      {/* Type Selection */}
      <div className="mb-4 space-y-2">
        <label className="text-xs text-gray-400">TYPE</label>
        <select 
          value={element.inAnimation?.type || 'none'}
          onChange={(e) => updateAnim('inAnimation', 'type', e.target.value)}
          className="w-full bg-fuchsia-950/10 border rounded p-2 text-sm outline-none border-gray-400 text-gray-400
          focus:border-orange-300 focus:outline-none hover:border-orange-300/50 
          [&>option]:bg-fuchsia-950 [&>option]:text-gray-400"
        >
          <option value="none">None</option>
          <option value="fade">Fade In</option>
          <option value="slide-left">Slide Left</option>
          <option value="slide-right">Slide Right</option>
        </select>
      </div>

      {/* Duration & Delay */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="space-y-1">
          <label className="text-xs text-gray-400">DURATION (S)</label>
          <input 
            type="number" 
            step="0.1"
            value={element.inAnimation?.duration || 0.5}
            onChange={(e) => updateAnim('inAnimation', 'duration', parseFloat(e.target.value))}
            className="w-full bg-fuchsia-950/10 border border-gray-400 rounded p-2 text-sm focus:border-orange-300 focus:outline-none hover:border-orange-300/50"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">DELAY (S)</label>
          <input 
            type="number" 
            step="0.1"
            value={element.inAnimation?.delay || 0}
            onChange={(e) => updateAnim('inAnimation', 'delay', parseFloat(e.target.value))}
            className="w-full bg-fuchsia-950/10 border border-gray-400 rounded p-2 text-sm focus:border-orange-300 focus:outline-none hover:border-orange-300/50"
          />
        </div>
      </div>
    </div>
  );
};