import React from 'react';
import { useDispatch } from 'react-redux';
import { ActionCreators } from 'redux-undo'; // Important for Undo/Redo
import { addElement } from '../../store/canvasSlice';
import { 
    Square,
    Circle,
    Type, 
    Image as ImageIcon, 
    Undo, 
    Redo,
    Triangle,
    Minus, 
    Star,
    MousePointer2
 } from 'lucide-react';

export const Toolbar = () => {
  const dispatch = useDispatch();

  const addLine = () => {
    dispatch(addElement({
      type:'line',
      name:'Line',
      x: 100,
      y: 300,
      width: 200,
      height:  2,
      stroke: '#ffffff',
      strokeWidth: 3,
      isLocked: false,
      isVisible: true,
      inAnimation: { ...defaultAnim},
      outAnimation: {... defaultAnim}
    }));
  };

  const addTriangle = () => {
  dispatch(addElement({
    type: 'triangle',
    name: 'Triangle',
    x: 300,
    y: 200,
    width: 120,
    height: 120,
    fill: '#00ffcc',
    opacity: 1,
    isLocked: false,
    isVisible: true,
    inAnimation: { ...defaultAnim },
    outAnimation: { ...defaultAnim }
  }));
};

const addStar = () => {
  dispatch(addElement({
    type: 'star',
    name: 'Star',
    x: 450,
    y: 200,
    width: 120,
    height: 120,
    fill: '#ffd700',
    opacity: 1,
    isLocked: false,
    isVisible: true,
    inAnimation: { ...defaultAnim },
    outAnimation: { ...defaultAnim }
  }));
};

const  selectTool = () => {
    console.log('Select tool  activated')
};


  // 1. Define the default animation payload
  const defaultAnim = { 
    type: 'fade', 
    duration: 0.5, 
    delay: 0, 
    ease: 'power1.out' 
  };

  // 2. Add Rectangle with animation props
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
      shadowColor: 'black',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      isLocked: false,
      isVisible: true,
      // Integrate default animations
      inAnimation: { ...defaultAnim },
      outAnimation: { ...defaultAnim }
    }));
  };

  // 3. Add Circle with animation props
  const addCircle = () => {
    dispatch(addElement({
      type: 'circle',
      name: 'Circle',
      x: 150,
      y: 150,
      width: 100, // Using width/height for bounding box consistency
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

  // 4. Add Text with animation props
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

  

  return (
    <div className="h-14 bg-panel border-b border-gray-700 flex items-center px-4 space-x-4">
      {/* Shape Tools */}
      <div className="flex space-x-2 border-r border-gray-600 pr-4">
        <button 
          onClick={addRect} 
          className="p-2 hover:bg-accent rounded transition-colors" 
          title="Add Rectangle"
        >
          <Square size={20} color="white"/>
        </button>
        
        <button 
          onClick={addCircle} 
          className="p-2 hover:bg-accent rounded transition-colors" 
          title="Add Circle"
        >
          <Circle size={20} color="white"/>
        </button>
        
        <button 
          onClick={addText} 
          className="p-2 hover:bg-accent rounded transition-colors" 
          title="Add Text"
        >
          <Type size={20} color="white"/>
        </button>
        
        <button 
          className="p-2 hover:bg-accent rounded transition-colors opacity-50 cursor-not-allowed" 
          title="Add Image (Coming Soon)"
        >
          <ImageIcon size={20} color="white"/>
        </button>
      </div>
      
      {/* History Controls */}
      <div className="flex space-x-2">
        <button 
          onClick={() => dispatch(ActionCreators.undo())} 
          className="p-2 hover:bg-gray-700 rounded transition-colors" 
          title="Undo"
        >
          <Undo size={20} color="white"/>
        </button>
        
        <button 
          onClick={() => dispatch(ActionCreators.redo())} 
          className="p-2 hover:bg-gray-700 rounded transition-colors" 
          title="Redo"
        >
          <Redo size={20} color="white"/>
        </button>

            <button
            onClick={addLine}
            className="p-2 hover:bg-accent rounded transition-colors"
            title="Add Line"
            >
            <Minus size={20} color="white" />
            </button>

            <button
            onClick={addTriangle}
            className="p-2 hover:bg-accent rounded transition-colors"
            title="Add Triangle"
            >
            <Triangle size={20} color="white" />
            </button>

            <button
            onClick={addStar}
            className="p-2 hover:bg-accent rounded transition-colors"
            title="Add Star"
            >
            <Star size={20} color="white" />
            </button>

            <button
            onClick={selectTool}
            className="p-2 hover:bg-accent rounded transition-colors"
            title="Select Tool"
            >
            <MousePointer2 size={20} color="white" />
            </button>
      </div>
    </div>
  );
};