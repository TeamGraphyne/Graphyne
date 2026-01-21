import { useSelector, useDispatch } from 'react-redux';
import { updateElement } from '../../store/canvasSlice';
import type { RootState } from '../../store/store';
import gsap from 'gsap';

export const AnimationPanel = () => {
  const dispatch = useDispatch();
  const selectedId = useSelector((state: RootState) => state.canvas.present.selectedIds[0]);
  const element = useSelector((state: RootState) => 
    state.canvas.present.elements.find(el => el.id === selectedId)
  );

  if (!element) return <div>Select an object to animate</div>;

  // 1. Function to update Redux State
  const updateAnim = (phase: 'inAnimation' | 'outAnimation', key: string, val: any) => {
    dispatch(updateElement({
      id: element.id,
      props: {
        [phase]: { ...element[phase], [key]: val }
      }
    }));
  };

  const handlePreview = () => {
  
    const node = (window as any).Konva.stages[0].findOne('#' + element.id);
    
    if (node) {
      // Reset
      gsap.killTweensOf(node);
      node.opacity(0); 
      
      // Play IN Animation based on selection
      if (element.inAnimation.type === 'fade') {
         gsap.to(node, { opacity: element.opacity, duration: element.inAnimation.duration });
      } else if (element.inAnimation.type === 'slide-left') {
         node.x(element.x - 100); // Start offset
         gsap.to(node, { x: element.x, opacity: element.opacity, duration: element.inAnimation.duration });
      }
    }
  };

   return (
    <div className="p-4 text-white">
      <h3 className="font-bold mb-2">In Animation</h3>
      
      <select 
        value={element.inAnimation.type}
        onChange={(e) => updateAnim('inAnimation', 'type', e.target.value)}
        className="w-full bg-gray-800 mb-2 p-1"
      >
        <option value="none">None</option>
        <option value="fade">Fade In</option>
        <option value="slide-left">Slide Left</option>
        <option value="slide-right">Slide Right</option>
      </select>

       <div className="flex gap-2">
        <input 
          type="number" 
          placeholder="Duration (s)"
          value={element.inAnimation.duration}
          onChange={(e) => updateAnim('inAnimation', 'duration', Number(e.target.value))}
          className="w-1/2 bg-gray-800 p-1"
        />
        <button onClick={handlePreview} className="bg-green-600 px-2 rounded">▶ Play</button>
      </div>
    </div>
  );
};


 