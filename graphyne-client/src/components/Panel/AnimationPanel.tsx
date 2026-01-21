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

 