import { useDispatch } from 'react-redux';
import { ActionCreators } from 'redux-undo'; 
import { addElement } from '../../store/canvasSlice';
import { 
    Square, Circle, Type, Image as ImageIcon, 
    Undo, Redo, MousePointer2, ZoomIn, ZoomOut
 } from 'lucide-react'; 

export const Toolbar = () => {
  const dispatch = useDispatch(); 

  const defaultAnim = { 
    type: 'fade', 
    duration: 0.5, 
    delay: 0, 
    ease: 'power1.out' 
  };

  const addRect = () => {
    dispatch(addElement({
      type: 'rect',
      name: 'Rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 0,
      opacity: 1,
      shadow: {
        color: 'black',
        blur: 0,
        offsetX: 0,
        offsetY: 0,
      },
      isLocked: false,
      isVisible: true,
      inAnimation: { ...defaultAnim },
      outAnimation: { ...defaultAnim }
    }));
  };

  const addCircle = () => {
    dispatch(addElement({
      type: 'circle',
      name: 'Circle',
      x: 150,
      y: 150,
      width: 100, 
      height: 100,
      fill: '#0000ff',
      stroke: '#000000',
      strokeWidth: 0,
      opacity: 1,
      isLocked: false,
      isVisible: true,
      inAnimation: { ...defaultAnim },
      outAnimation: { ...defaultAnim }
    }));
  };

  const addText = () => {
    dispatch(addElement({
      type: 'text',
      name: 'Text Layer',
      x: 200,
      y: 200,
      text: 'Double click to edit',
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#ffffff',
      width: 200,
      height: 40,
      opacity: 1,
      isLocked: false,
      isVisible: true,
      inAnimation: { ...defaultAnim },
      outAnimation: { ...defaultAnim }
    }));
  };

  const selectTool = () =>{ console.log('Select tool activated'); }
  const zoomIn = () => { console.log('Zoom in triggered'); };
  const zoomOut = () => { console.log('Zoom out triggered'); };

  return (
    <div className="h-14 bg-gray-900 border-b border-gray-700 flex items-center px-4 space-x-4 text-white">
      {/* Shape Tools */}
      <div className="flex space-x-2 border-r border-gray-600 pr-4">
        <button onClick={addRect} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Add Rectangle">
          <Square size={20} />
        </button>
        <button onClick={addCircle} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Add Circle">
          <Circle size={20} />
        </button>
        <button onClick={addText} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Add Text">
          <Type size={20} />
        </button>
        <button className="p-2 hover:bg-gray-700 rounded transition-colors opacity-50 cursor-not-allowed" title="Add Image (Coming Soon)">
          <ImageIcon size={20} />
        </button>
      </div>
      
      {/* History Controls */}
      <div className="flex space-x-2">
        <button onClick={() => dispatch(ActionCreators.undo())} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Undo">
          <Undo size={20} />
        </button>
        <button onClick={() => dispatch(ActionCreators.redo())} className="p-2 hover:bg-gray-700 rounded transition-colors" title="Redo">
          <Redo size={20} />
        </button>
        <button onClick={zoomIn} className="p-2 hover:bg-gray-700 rounded" title="Zoom In">
          <ZoomIn size={20} />
        </button>
        <button onClick={zoomOut} className="p-2 hover:bg-gray-700 rounded" title="Zoom Out">
          <ZoomOut size={20} />
        </button>
        <button onClick={selectTool} className="p-2 hover:bg-gray-700 rounded" title="Select Tool">
          <MousePointer2 size={20} />
        </button>
      </div>
    </div>
  );
};