import { useState, useEffect } from 'react';
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
import { updateElement, updateConfig } from '../../store/canvasSlice';
import type { CanvasElement, ShadowEffect } from '../../types/canvas';
import { AnimationPanel } from './AnimationPanel';
import { DataBindingTab } from './DataBindingTab';
import { api } from '../../services/api';

export const PropertiesPanel = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'design' | 'animate' | 'data'>('design');

  // 1. Access state via .present because of redux-undo
  const selectedId = useSelector((state: RootState) => state.canvas.present.selectedIds[0]);
  
  const element = useSelector((state: RootState) => 
    state.canvas.present.elements.find((el: CanvasElement) => el.id === selectedId)
  );

  const config = useSelector((state: RootState) => state.canvas.present.config);

  const [systemFonts, setSystemFonts] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    api.getSystemFonts()
      .then(fonts => {
        if (mounted) setSystemFonts(fonts);
      })
      .catch(err => console.error('Failed to load system fonts:', err));
    return () => { mounted = false; };
  }, []);

  if (!element) {
    return (
      <div className="w-80 bg-fuchsia-950/40 border-l border-fuchsia-200/30 text-white flex flex-col h-full z-20">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold mb-4 text-xs text-gray-400 uppercase tracking-wider">Canvas Settings</h2>
          
          <div className="space-y-4">
            {/* Resolution Dropdown */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1 uppercase">Resolution</label>
              <select 
                value={`${config.width}x${config.height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  dispatch(updateConfig({ width: w, height: h }));
                }}
                className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-orange-300 focus:outline-none text-gray-300"
              >
                <option value="1920x1080">16:9 Landscape (1920×1080)</option>
                <option value="1080x1920">9:16 Vertical (1080×1920)</option>
                <option value="1080x1080">1:1 Square (1080×1080)</option>
              </select>
            </div>
            
            {/* Background Color Picker */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1 uppercase">Background</label>
              <div className="flex items-center gap-2 bg-fuchsia-950/10 p-1 rounded border border-gray-400 hover:border-orange-300">
                <input 
                  type="color" 
                  value={config.background || '#000000'} 
                  onChange={(e) => dispatch(updateConfig({ background: e.target.value }))} 
                  className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
                />
                <span className="text-xs text-gray-400 font-mono">{config.background || '#000000'}</span>
              </div>
            </div>
          </div>
        </div>
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
    <div className="w-80 bg-fuchsia-950/40 border-l border-fuchsia-200/30 text-white flex flex-col h-full z-20">
      
      {/* --- Tab Navigation (3 tabs now) --- */}
      <div className="flex border-b border-fuchsia-200/30">
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'design' 
              ? 'text-orange-300 border-b-2 border-orange-300 bg-fuchsia-950' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-fuchsia-950'
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setActiveTab('animate')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'animate' 
              ? 'text-orange-300 border-b-2 border-orange-300 bg-fuchsia-950' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-fuchsia-950'
          }`}
        >
          Animate
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'data' 
              ? 'text-orange-300 border-b-2 border-orange-300 bg-fuchsia-950' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-fuchsia-950'
          }`}
        >
          Data
        </button>
      </div>

      {/* --- Tab Content Area --- */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        
        {/* VIEW 1: DESIGN CONTROLS */}
        {activeTab === 'design' && (
          <div className="p-4 space-y-6">

            {/* TYPOGRAPHY SECTION (Text Only) */}
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
                                {systemFonts.length > 0 && (
                                  <optgroup label="System Fonts">
                                    {systemFonts.map(font => (
                                      <option key={font} value={`'${font}'`}>{font}</option>
                                    ))}
                                  </optgroup>
                                )}
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
              <h2 className="text-[14px] font-bold mb-3 text-xs text-gray-400 uppercase tracking-wider">Transform</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[12px] text-gray-400 block mb-1 uppercase">X Position</label>
                  <input 
                    type="number" 
                    value={Math.round(element.x)} 
                    onChange={(e) => handleChange('x', Number(e.target.value))} 
                    className="w-full bg-fuchsia-950/10 p-2 rounded text-xs border border-gray-400 focus:border-orange-300 focus:outline-none hover:border-orange-300/50 text-gray-400" 
                  />
                </div>
                <div>
                  <label className="text-[12px] text-gray-400 block mb-1 uppercase">Y Position</label>
                  <input 
                    type="number" 
                    value={Math.round(element.y)} 
                    onChange={(e) => handleChange('y', Number(e.target.value))} 
                    className="w-full bg-fuchsia-950/10 p-2 rounded text-xs border border-gray-400 focus:border-orange-300 focus:outline-none hover:border-orange-300/50 text-gray-400" 
                  />
                </div>
                <div>
                  <label className="text-[12px] text-gray-400 block mb-1 uppercase">Width</label>
                  <input 
                    type="number" 
                    value={Math.round(element.width)} 
                    onChange={(e) => handleChange('width', Number(e.target.value))} 
                    className="w-full bg-fuchsia-950/10 p-2 rounded text-xs border border-gray-400 focus:border-orange-300 focus:outline-none hover:border-orange-300/50 text-gray-400" 
                  />
                </div>
                <div>
                  <label className="text-[12px] text-gray-400 block mb-1 uppercase">Height</label>
                  <input 
                    type="number" 
                    value={Math.round(element.height)} 
                    onChange={(e) => handleChange('height', Number(e.target.value))} 
                    className="w-full bg-fuchsia-950/10 p-2 rounded text-xs border border-gray-400 focus:border-orange-300 focus:outline-none hover:border-orange-300/50 text-gray-400" 
                  />
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div>
              <h2 className="text-[14px] font-bold mb-3 text-xs text-gray-400 uppercase tracking-wider">Appearance</h2>
              <div className="space-y-3">

                {/* Fill Type */}
                <div>
                  <label className="text-[10px] text-gray-400  mb-1 uppercase flex justify-between">Fill Type</label>
                  <select 
                    value={element.fillType || 'solid'}
                    onChange={(e) => {
                      handleChange('fillType', e.target.value);
                      if (!element.fillSecondary) {
                        handleChange('fillSecondary', "#62a0ea");
                      }
                    }}
                    className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-orange-300 focus:outline-none text-gray-300" 
                  >
                    <option value="solid">Solid</option>
                    <option value="linear">Linear Gradient</option>
                    <option value="radial">Radial Gradient</option>
                  </select>
                </div>

                {/* Solid Fill */}
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase justify-between">
                    {element.fillType && element.fillType !== 'solid' ? 'Start Color' : 'Fill Color'}
                  </label>
                  <div className="flex items-center gap-2 bg-fuchsia-950/10 p-1 rounded border border-gray-400 hover:border-orange-300">
                    <input 
                      type="color" 
                      value={element.fill} 
                      onChange={(e) => handleChange('fill', e.target.value)} 
                      className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                    <span className="text-xs text-gray-400 font-mono">{element.fill}</span>
                  </div>
                </div>

                {/* Secondary Color */}
                {element.fillType && element.fillType !== 'solid' && (
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 uppercase justify-between">End Color</label>
                    <div className="flex items-center gap-2 bg-fuchsia-950/10 p-1 rounded border border-gray-400 hover:border-orange-300">
                      <input 
                        type="color" 
                        value={element.fillSecondary || "#62a0ea"}
                        onChange={(e) => handleChange('fillSecondary', e.target.value)} 
                        className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <span className="text-xs text-gray-400 font-mono">{element.fillSecondary}</span>
                    </div>
                  </div>
                )}

                {/* Stroke Width */}
                <div>
                  <label className="text-[10px] text-gray-400 mb-1 uppercase flex justify-between">
                    <span>Stroke Width</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={element.strokeWidth || 0}
                    onChange={(e) => handleChange("strokeWidth", Number(e.target.value))} 
                    className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-blue-500 focus:outline-none text-gray-300" 
                  />
                </div>

                {/* Stroke Fill */}
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 uppercase">Stroke Fill</label>
                  <div className="flex items-center gap-2 bg-gray-950 p-1 rounded border border-gray-800">
                    <input 
                      type="color" 
                      value={element.stroke} 
                      onChange={(e) => handleChange('stroke', e.target.value)} 
                      className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" 
                    />
                    <span className="text-xs text-gray-400 font-mono">{element.stroke}</span>
                  </div>
                </div>

                {/* Corner Radius*/}
                <div>
                  <label className="text-[10px] text-gray-400 mb-1 uppercase flex justify-between">
                    <span>Corner Radius</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={element.cornerRadius || 0}
                    onChange={(e) => handleChange("cornerRadius", Number(e.target.value))} 
                    className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-blue-500 focus:outline-none text-gray-300" 
                  />
                </div>

                {/* Opacity */}
                <div>
                    <label className="text-[12px] text-gray-400  mb-1 uppercase flex justify-between">
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
                        className="w-full h-1 bg-gray-400/50 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none 
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-2
                        [&::-webkit-slider-thumb]:rounded-full 
                        [&::-webkit-slider-thumb]:bg-white/50
                        hover:[&::-webkit-slider-thumb]:bg-orange-300"
                    />
                </div>

                {/* NEW: Blend Mode */}
                <div>
                  <label className="text-[10px] text-gray-400 mb-1 uppercase flex justify-between">Blend Mode</label>
                  <select 
                    value={element.blendMode || 'normal'}
                    onChange={(e) => handleChange('blendMode', e.target.value)}
                    className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-orange-300 focus:outline-none text-gray-300"
                  >
                    <option value="normal">Normal</option>
                    <option value="multiply">Multiply</option>
                    <option value="screen">Screen</option>
                    <option value="overlay">Overlay</option>
                    <option value="darken">Darken</option>
                    <option value="lighten">Lighten</option>
                    <option value="color-dodge">Color Dodge</option>
                    <option value="color-burn">Color Burn</option>
                    <option value="hard-light">Hard Light</option>
                    <option value="soft-light">Soft Light</option>
                    <option value="difference">Difference</option>
                    <option value="exclusion">Exclusion</option>
                  </select>
                </div>

                {/* Shadow Controls */}
                <div> 
                  <h3 className="text-[14px] font-bold  mb-2 text-gray-400 flex items-center gap-2">
                    SHADOWS
                    <input 
                        type="checkbox" 
                        checked={!!element.shadow}
                        onChange={(e) => {
                            if (!e.target.checked) handleChange('shadow', undefined);
                            else handleShadowChange('blur', 10);
                        }}
                        className="accent-orange-300"
                    />
                  </h3>
                  
                  {element.shadow && (
                      <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-orange-300">
                        <div className="col-span-2">
                          <label className="text-[12px] text-gray-400 block mb-1 uppercase">Blur Radius</label>
                          <input 
                            type="range" 
                            min="0" 
                            max="50" 
                            value={element.shadow.blur || 0} 
                            onChange={(e) => handleShadowChange('blur', Number(e.target.value))} 
                            className="w-full appearance-none h-1 bg-gray-400/50 rounded-lg cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none 
                             [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-2
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-white/50
                            hover:[&::-webkit-slider-thumb]:bg-orange-300"
                          />
                        </div>
                        
                        <div>
                          <label className="text-[12px] text-gray-400 block mb-1 uppercase">Offset X</label>
                          <input 
                            type="number" 
                            value={element.shadow.offsetX || 0} 
                            onChange={(e) => handleShadowChange('offsetX', Number(e.target.value))} 
                            className="w-full bg-fuchsia-950/10 p-1 rounded text-xs border border-gray-400 text-gray-400 focus:border-orange-300 focus:outline-none hover:border-orange-300/50" 
                          />
                        </div>

                        <div>
                          <label className="text-[12px] text-gray-400 block mb-1 uppercase">Offset Y</label>
                          <input 
                            type="number" 
                            value={element.shadow.offsetY || 0} 
                            onChange={(e) => handleShadowChange('offsetY', Number(e.target.value))} 
                            className="w-full bg-fuchsia-950/10 p-1 rounded text-xs border border-gray-400 text-gray-400 focus:border-orange-300 focus:outline-none hover:border-orange-300/50" 
                          />
                        </div>

                        <div className="col-span-2">
                             <label className="text-[10px] text-gray-400 block mb-1 uppercase">Shadow Color</label>
                             <div className="flex items-center gap-2 bg-fuchsia-950/10 p-1 rounded border border-gray-400 hover:border-orange-300">
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
  
             <AnimationPanel />
    
        )}

        {/* VIEW 3: DATA BINDING CONTROLS (NEW) */}
        {activeTab === 'data' && (
          <DataBindingTab />
        )}

      </div>
    </div>
  );
};