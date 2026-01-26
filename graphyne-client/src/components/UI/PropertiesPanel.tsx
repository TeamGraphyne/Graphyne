import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Type 
} from 'lucide-react';
import type { RootState } from '../../store/store';
import { updateElement } from '../../store/canvasSlice';
import type { CanvasElement, ShadowEffect } from '../../types/canvas';
import { AnimationPanel } from './AnimationPanel';

export const PropertiesPanel = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'design' | 'animate'>('design');

  // 1. Access state via .present because of redux-undo
  const selectedId = useSelector((state: RootState) => state.canvas.present.selectedIds[0]);
  
  const element = useSelector((state: RootState) => 
    state.canvas.present.elements.find((el: CanvasElement) => el.id === selectedId)
  );

  if (!element) {
    return (
      <div className="w-80 bg-gray-900 border-l border-gray-800 text-gray-500 flex items-center justify-center h-full text-sm">
        Select an element to edit
      </div>
    );
  }

  // CanvasElement values
  type ElementValue = string | number | boolean | ShadowEffect | undefined;

  const handleChange = (key: keyof CanvasElement, value: ElementValue) => {
    dispatch(updateElement({ id: element.id, [key]: value }));
  };

  const handleShadowChange = (key: keyof ShadowEffect, value: number | string) => {
    const currentShadow = element.shadow || { 
      color: '#000000', 
      blur: 0, 
      offsetX: 0, 
      offsetY: 0 
    };

    const newShadow = {
      ...currentShadow,
      [key]: value
    };

    dispatch(updateElement({ id: element.id, shadow: newShadow }));
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 text-white flex flex-col h-full z-20">
      
      {/* --- Tab Navigation --- */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'design' 
              ? 'text-blue-500 border-b-2 border-blue-500 bg-gray-800/50' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setActiveTab('animate')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'animate' 
              ? 'text-blue-500 border-b-2 border-blue-500 bg-gray-800/50' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          Animate
        </button>
      </div>

      {/* --- Tab Content Area --- */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        
        {/* VIEW 1: DESIGN CONTROLS */}
        {activeTab === 'design' && (
          <div className="p-4 space-y-6">

            {/* [NEW] TYPOGRAPHY SECTION (Text Only) */}
            {element.type === 'text' && (
              <div className="border-b border-gray-800 pb-6">
                <h2 className="font-bold mb-3 text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Type size={12} /> Typography
                </h2>
                
                {/* Text Content */}
                <div className="mb-4">
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase">Content</label>
                  <textarea
                    value={element.text || ""}
                    onChange={(e) => handleChange('text', e.target.value)}
                    rows={3}
                    className="w-full bg-gray-950 p-2 rounded text-sm border border-gray-800 focus:border-blue-500 focus:outline-none text-white resize-none font-sans"
                    placeholder="Enter text..."
                  />
                </div>

                <div className="space-y-3">
                    {/* Font Family & Size */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-gray-400 block mb-1 uppercase">Size (px)</label>
                            <input 
                                type="number" 
                                value={element.fontSize || 20} 
                                onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                                className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-blue-500 focus:outline-none text-gray-300"
                            />
                        </div>
                         <div>
                            <label className="text-[10px] text-gray-400 block mb-1 uppercase">Font</label>
                            <select 
                                value={element.fontFamily || 'Arial, sans-serif'} 
                                onChange={(e) => handleChange('fontFamily', e.target.value)}
                                className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-blue-500 focus:outline-none text-gray-300"
                            >
                                <option value="Arial, sans-serif">Arial</option>
                                <option value="'Times New Roman', serif">Times New Roman</option>
                                <option value="'Courier New', monospace">Courier New</option>
                                <option value="'Roboto', sans-serif">Roboto</option>
                                <option value="'Montserrat', sans-serif">Montserrat</option>
                                <option value="'Open Sans', sans-serif">Open Sans</option>
                            </select>
                        </div>
                    </div>

                    {/* Formatting Buttons */}
                    <div>
                         <label className="text-[10px] text-gray-400 block mb-1 uppercase">Formatting</label>
                         <div className="flex bg-gray-950 rounded border border-gray-800 p-1 gap-1">
                            {/* Bold */}
                            <button 
                                onClick={() => handleChange('fontWeight', element.fontWeight === 'bold' ? 'normal' : 'bold')}
                                className={`p-1.5 rounded hover:bg-gray-800 flex-1 flex justify-center ${element.fontWeight === 'bold' ? 'bg-gray-800 text-blue-400' : 'text-gray-400'}`}
                                title="Bold"
                            >
                                <Bold size={14} />
                            </button>
                            
                            {/* Italic */}
                            <button 
                                onClick={() => handleChange('fontStyle', element.fontStyle === 'italic' ? 'normal' : 'italic')}
                                className={`p-1.5 rounded hover:bg-gray-800 flex-1 flex justify-center ${element.fontStyle === 'italic' ? 'bg-gray-800 text-blue-400' : 'text-gray-400'}`}
                                title="Italic"
                            >
                                <Italic size={14} />
                            </button>

                            <div className="w-px bg-gray-800 mx-1"></div>

                            {/* Alignment */}
                            <button 
                                onClick={() => handleChange('align', 'left')}
                                className={`p-1.5 rounded hover:bg-gray-800 flex-1 flex justify-center ${(!element.align || element.align === 'left') ? 'bg-gray-800 text-blue-400' : 'text-gray-400'}`}
                            >
                                <AlignLeft size={14} />
                            </button>
                            <button 
                                onClick={() => handleChange('align', 'center')}
                                className={`p-1.5 rounded hover:bg-gray-800 flex-1 flex justify-center ${element.align === 'center' ? 'bg-gray-800 text-blue-400' : 'text-gray-400'}`}
                            >
                                <AlignCenter size={14} />
                            </button>
                            <button 
                                onClick={() => handleChange('align', 'right')}
                                className={`p-1.5 rounded hover:bg-gray-800 flex-1 flex justify-center ${element.align === 'right' ? 'bg-gray-800 text-blue-400' : 'text-gray-400'}`}
                            >
                                <AlignRight size={14} />
                            </button>
                         </div>
                    </div>
                </div>
              </div>
            )}
            
            {/* Dimensions */}
            <div>
              <h2 className="font-bold mb-3 text-xs text-gray-500 uppercase tracking-wider">Transform</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase">X Position</label>
                  <input 
                    type="number" 
                    value={Math.round(element.x)} 
                    onChange={(e) => handleChange('x', Number(e.target.value))} 
                    className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-blue-500 focus:outline-none text-gray-300" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase">Y Position</label>
                  <input 
                    type="number" 
                    value={Math.round(element.y)} 
                    onChange={(e) => handleChange('y', Number(e.target.value))} 
                    className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-blue-500 focus:outline-none text-gray-300" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase">Width</label>
                  <input 
                    type="number" 
                    value={Math.round(element.width)} 
                    onChange={(e) => handleChange('width', Number(e.target.value))} 
                    className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-blue-500 focus:outline-none text-gray-300" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase">Height</label>
                  <input 
                    type="number" 
                    value={Math.round(element.height)} 
                    onChange={(e) => handleChange('height', Number(e.target.value))} 
                    className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-blue-500 focus:outline-none text-gray-300" 
                  />
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="border-t border-gray-800 pt-4">
              <h2 className="font-bold mb-3 text-xs text-gray-500 uppercase tracking-wider">Appearance</h2>
              <div className="space-y-3">
                
                {/* Fill Color */}
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase">Fill Color</label>
                  <div className="flex items-center gap-2 bg-gray-950 p-1 rounded border border-gray-800">
                    <input 
                      type="color" 
                      value={element.fill} 
                      onChange={(e) => handleChange('fill', e.target.value)} 
                      className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" 
                    />
                    <span className="text-xs text-gray-400 font-mono">{element.fill}</span>
                  </div>
                </div>

                {/* Opacity */}
                <div>
                    <label className="text-[10px] text-gray-400 block mb-1 uppercase flex justify-between">
                        <span>Opacity</span>
                        <span>{Math.round((element.opacity || 1) * 100)}%</span>
                    </label>
                    <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={element.opacity ?? 1}
                        onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
                        className="w-full accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                {/* Shadow Controls */}
                <div className="border-t border-gray-800 pt-3 mt-3">
                  <h3 className="text-xs font-semibold mb-2 text-gray-300 flex items-center gap-2">
                    Shadows
                    <input 
                        type="checkbox" 
                        checked={!!element.shadow}
                        onChange={(e) => {
                            if (!e.target.checked) handleChange('shadow', undefined);
                            else handleShadowChange('blur', 10);
                        }}
                        className="accent-blue-500"
                    />
                  </h3>
                  
                  {element.shadow && (
                      <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-gray-800">
                        <div className="col-span-2">
                          <label className="text-[10px] text-gray-400 block mb-1 uppercase">Blur Radius</label>
                          <input 
                            type="range" 
                            min="0" 
                            max="50" 
                            value={element.shadow.blur || 0} 
                            onChange={(e) => handleShadowChange('blur', Number(e.target.value))} 
                            className="w-full accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1 uppercase">Offset X</label>
                          <input 
                            type="number" 
                            value={element.shadow.offsetX || 0} 
                            onChange={(e) => handleShadowChange('offsetX', Number(e.target.value))} 
                            className="w-full bg-gray-950 p-1 rounded text-xs border border-gray-800 text-gray-300" 
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1 uppercase">Offset Y</label>
                          <input 
                            type="number" 
                            value={element.shadow.offsetY || 0} 
                            onChange={(e) => handleShadowChange('offsetY', Number(e.target.value))} 
                            className="w-full bg-gray-950 p-1 rounded text-xs border border-gray-800 text-gray-300" 
                          />
                        </div>

                        <div className="col-span-2">
                             <label className="text-[10px] text-gray-400 block mb-1 uppercase">Shadow Color</label>
                             <div className="flex items-center gap-2 bg-gray-950 p-1 rounded border border-gray-800">
                                <input 
                                type="color" 
                                value={element.shadow.color || '#000000'} 
                                onChange={(e) => handleShadowChange('color', e.target.value)} 
                                className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" 
                                />
                                <span className="text-xs text-gray-400 font-mono">{element.shadow.color}</span>
                            </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: ANIMATION CONTROLS */}
        {activeTab === 'animate' && (
          <div className="h-full p-4">
             <AnimationPanel />
          </div>
        )}

      </div>
    </div>
  );
};