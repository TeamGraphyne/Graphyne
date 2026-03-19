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
import { DataBindingTab } from './DataBindingTab';

export const PropertiesPanel = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'design' | 'animate' | 'data'>('design');

  // 1. Access state via .present because of redux-undo
  const selectedId = useSelector((state: RootState) => state.canvas.present.selectedIds[0]);
  
  const element = useSelector((state: RootState) => 
    state.canvas.present.elements.find((el: CanvasElement) => el.id === selectedId)
  );

  if (!element) {
    return (
      <div className="w-80 bg-panel border-l border-border text-txt flex items-center justify-center h-full text-sm">
        Select an element to edit
      </div>
  )}

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
    <div className="w-80 bg-panel border-l border-border text-txt flex flex-col h-full z-20">
      
      {/* --- Tab Navigation (3 tabs now) --- */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'design' 
              ? 'text-select border-b-2 border-select bg-btnHover' 
              : 'text-txtDisabled hover:text-txtHover hover:bg-btnSelect'
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setActiveTab('animate')}
          className={`flex-1 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'animate' 
              ? 'text-select border-b-2 border-select bg-btnHover' 
              : 'text-txtDisabled hover:text-txtHover hover:bg-btnSelect'
          }`}
        >
          Animate
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 py-3 text-[12px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'data' 
              ? 'text-select border-b-2 border-select bg-btnHover' 
              : 'text-txtDisabled hover:text-txtHover hover:bg-btnSelect'
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
              <div className="border-b border-border pb-6">
                <h2 className="font-bold mb-3 text-[14px] text-txt uppercase tracking-wider flex items-center gap-2">
                  <Type size={12} /> Typography
                </h2>
                
                {/* Text Content */}
                <div className="mb-4">
                  <label className="text-[10px] text-txt block mb-1 uppercase">Content</label>
                  <textarea
                    value={element.text || ""}
                    onChange={(e) => handleChange('text', e.target.value)}
                    rows={3}
                    className="w-full bg-panel p-2 rounded text-[14px] border border-border hover:border-hover focus:border-select focus:outline-none text-txt focus:text-txtSelect resize-none font-sans"
                    placeholder="Enter text..."
                  />
                </div>

                <div className="space-y-3">
                    {/* Font Family & Size */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-txt block mb-1 uppercase">Size (px)</label>
                            <input 
                                type="number" 
                                value={element.fontSize || 20} 
                                onChange={(e) => handleChange('fontSize', Number(e.target.value))}
                                className="w-full bg-panel p-2 rounded text-[14px] border border-border hover:border-hover focus:border-select focus:outline-none text-txt focus:text-txtSelect"
                            />
                        </div>
                         <div>
                            <label className="text-[10px] text-txt block mb-1 uppercase">Font</label>
                            <select 
                                value={element.fontFamily || 'Arial, sans-serif'} 
                                onChange={(e) => handleChange('fontFamily', e.target.value)}
                                className="w-full bg-panel p-2 rounded text-[14px] border border-border hover:border-hover focus:border-select focus:outline-none text-txt focus:text-txtSelect"
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
                         <label className="text-[10px] text-txt block mb-1 uppercase">Formatting</label>
                         <div className="flex bg-panel rounded border border-border hover:border-hover p-1 gap-1">
                            {/* Bold */}
                            <button 
                                onClick={() => handleChange('fontWeight', element.fontWeight === 'bold' ? 'normal' : 'bold')}
                                className={`p-1.5 rounded hover:bg-btnHover flex-1 flex justify-center ${element.fontWeight === 'bold' ? 'bg-btnSelect text-txtSelect' : 'text-txt'}`}
                                title="Bold"
                            >
                                <Bold size={14} />
                            </button>
                            
                            {/* Italic */}
                            <button 
                                onClick={() => handleChange('fontStyle', element.fontStyle === 'italic' ? 'normal' : 'italic')}
                                className={`p-1.5 rounded hover:bg-btnHover flex-1 flex justify-center ${element.fontStyle === 'italic' ? 'bg-btnSelect text-txtSelect' : 'text-txt'}`}
                                title="Italic"
                            >
                                <Italic size={14} />
                            </button>

                            <div className="w-px bg-panel mx-1"></div>

                            {/* Alignment */}
                            <button 
                                onClick={() => handleChange('align', 'left')}
                                className={`p-1.5 rounded hover:bg-btnHover flex-1 flex justify-center ${(!element.align || element.align === 'left') ? 'bg-btnSelect0 text-txtSelect' : 'text-txt'}`}
                            >
                                <AlignLeft size={14} />
                            </button>
                            <button 
                                onClick={() => handleChange('align', 'center')}
                                className={`p-1.5 rounded hover:bg-btnHover flex-1 flex justify-center ${element.align === 'center' ? 'bg-btnSelect text-txtSelect' : 'text-txt'}`}
                            >
                                <AlignCenter size={14} />
                            </button>
                            <button 
                                onClick={() => handleChange('align', 'right')}
                                className={`p-1.5 rounded hover:bg-btnHover flex-1 flex justify-center ${element.align === 'right' ? 'bg-btnSelect text-txtSelect' : 'text-txt'}`}
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
              <h2 className="text-[14px] font-bold mb-3 text-txt uppercase tracking-wider">Transform</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-txt block mb-1 uppercase">X Position</label>
                  <input 
                    type="number" 
                    value={Math.round(element.x)} 
                    onChange={(e) => handleChange('x', Number(e.target.value))} 
                    className="w-full bg-panel p-2 rounded text-[14px] border border-border focus:border-select focus:outline-none hover:border-hover text-txt focus:text-txtSelect" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-txt block mb-1 uppercase">Y Position</label>
                  <input 
                    type="number" 
                    value={Math.round(element.y)} 
                    onChange={(e) => handleChange('y', Number(e.target.value))} 
                    className="w-full bg-panel p-2 rounded text-[14px] border border-border focus:border-select focus:outline-none hover:border-hover text-txt focus:text-txtSelect" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-txt block mb-1 uppercase">Width</label>
                  <input 
                    type="number" 
                    value={Math.round(element.width)} 
                    onChange={(e) => handleChange('width', Number(e.target.value))} 
                    className="w-full bg-panel p-2 rounded text-[14px] border border-border focus:border-select focus:outline-none hover:border-hover text-txt focus:text-txtSelect" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-txt block mb-1 uppercase">Height</label>
                  <input 
                    type="number" 
                    value={Math.round(element.height)} 
                    onChange={(e) => handleChange('height', Number(e.target.value))} 
                    className="w-full bg-panel p-2 rounded text-[14px] border border-border focus:border-select focus:outline-none hover:border-hover text-txt focus:text-txtSelect" 
                  />
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div>
              <h2 className="text-[14px] font-bold mb-3 text-xs text-txt uppercase tracking-wider">Appearance</h2>
              <div className="space-y-3">

                {/* Fill Type — MODIFIED: hidden for image elements (images don't have a fill colour) */}
                {element.type !== 'image' && (
                  <div>
                    <label className="text-[10px] text-txt mb-1 uppercase flex justify-between">Fill Type</label>
                    <select 
                      value={element.fillType || 'solid'}
                      onChange={(e) => {
                        handleChange('fillType', e.target.value);
                        if (!element.fillSecondary) {
                          handleChange('fillSecondary', "#62a0ea");
                        }
                      }}
                      className="w-full bg-panel p-2 rounded text-[14px] border border-border focus:border-select hover:border-hover focus:outline-none text-txt focus:text-txtSelect" 
                    >
                      <option value="solid">Solid</option>
                      <option value="linear">Linear Gradient</option>
                      <option value="radial">Radial Gradient</option>
                    </select>
                  </div>
                )}

                {/* Solid Fill */}
                {element.type !== 'image' && (
                  <div>
                    <label className="text-[10px] text-txt block mb-1 uppercase justify-between">
                      {element.fillType && element.fillType !== 'solid' ? 'Start Color' : 'Fill Color'}
                    </label>
                    <div className="flex items-center gap-2 bg-panel p-1 rounded border border-border hover:border-hover focus:border-select">
                      <input 
                        type="color" 
                        value={element.fill} 
                        onChange={(e) => handleChange('fill', e.target.value)} 
                        className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <span className="text-[14px] text-txt font-mono">{element.fill}</span>
                    </div>
                  </div>
                )}

                {/* Secondary Color — only for non-image gradient fills */}
                {element.type !== 'image' && element.fillType && element.fillType !== 'solid' && (
                  <div>
                    <label className="text-[10px] text-txt block mb-1 uppercase justify-between">End Color</label>
                    <div className="flex items-center gap-2 bg-panel p-1 rounded border border-border hover:border-hover focus:border-select">
                      <input 
                        type="color" 
                        value={element.fillSecondary || "#62a0ea"}
                        onChange={(e) => handleChange('fillSecondary', e.target.value)} 
                        className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <span className="text-[14px] text-txt font-mono">{element.fillSecondary}</span>
                    </div>
                  </div>
                )}

                {/* Stroke Width — not applicable to images */}
                {element.type !== 'image' && (
                  <div>
                    <label className="text-[10px] text-txt mb-1 uppercase flex justify-between">
                      <span>Stroke Width</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={element.strokeWidth || 0}
                      onChange={(e) => handleChange("strokeWidth", Number(e.target.value))} 
                      className="w-full bg-panel p-2 rounded text-[14px] border border-border hover:border-hover focus:border-select focus:outline-none text-txt focus:text-txtSelect" 
                    />
                  </div>
                )}

                {/* Stroke Fill — not applicable to images */}
                {element.type !== 'image' && (
                  <div>
                    <label className="text-[10px] text-txt block mb-1 uppercase">Stroke Fill</label>
                    <div className="flex items-center gap-2 bg-panel p-1 rounded border border-border hover:border-hover focus:border-select">
                      <input 
                        type="color" 
                        value={element.stroke} 
                        onChange={(e) => handleChange('stroke', e.target.value)} 
                        className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" 
                      />
                      <span className="text-[14px] text-txt font-mono">{element.stroke}</span>
                    </div>
                  </div>
                )}

                {/* Corner Radius — MODIFIED: only for rect and image elements */}
                {(element.type === 'rect' || element.type === 'image') && (
                  <div>
                    <label className="text-[10px] text-txt mb-1 uppercase flex justify-between">
                      <span>Corner Radius</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={element.cornerRadius || 0}
                      onChange={(e) => handleChange("cornerRadius", Number(e.target.value))} 
                      className="w-full bg-panel p-2 rounded text-[14px] border border-border hover:border-hover focus:border-select focus:outline-none text-txt focus:text-txtSelect" 
                    />
                  </div>
                )}

                {/* Opacity */}
                <div>
                    <label className="text-[10px] text-txt mb-1 uppercase flex justify-between">
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
                        className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none 
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-2
                        [&::-webkit-slider-thumb]:rounded-full 
                        [&::-webkit-slider-thumb]:bg-btn
                        hover:[&::-webkit-slider-thumb]:bg-select"
                    />
                </div>

                {/* Shadow Controls */}
                <div> 
                  <h3 className="text-[14px] font-bold mb-2 text-txt flex items-center gap-2">
                    SHADOWS
                    <input 
                        type="checkbox" 
                        checked={!!element.shadow}
                        onChange={(e) => {
                            if (!e.target.checked) handleChange('shadow', undefined);
                            else handleShadowChange('blur', 10);
                        }}
                        className="accent-select"
                    />
                  </h3>
                  
                  {element.shadow && (
                      <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-select">
                        <div className="col-span-2">
                          <label className="text-[10px] text-txt block mb-1 uppercase">Blur Radius</label>
                          <input 
                            type="range" 
                            min="0" 
                            max="50" 
                            value={element.shadow.blur || 0} 
                            onChange={(e) => handleShadowChange('blur', Number(e.target.value))} 
                            className="w-full appearance-none h-1 bg-border rounded-lg cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none 
                             [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-2
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-btn
                            hover:[&::-webkit-slider-thumb]:bg-select"
                          />
                        </div>
                        
                        <div>
                          <label className="text-[10px] text-txt block mb-1 uppercase">Offset X</label>
                          <input 
                            type="number" 
                            value={element.shadow.offsetX || 0} 
                            onChange={(e) => handleShadowChange('offsetX', Number(e.target.value))} 
                            className="w-full bg-panel p-1 rounded text-[14px] border border-border text-txt focus:text-txtSelect hover:border-hover focus:border-orange-300 focus:outline-none" 
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-txt block mb-1 uppercase">Offset Y</label>
                          <input 
                            type="number" 
                            value={element.shadow.offsetY || 0} 
                            onChange={(e) => handleShadowChange('offsetY', Number(e.target.value))} 
                            className="w-full bg-panel p-1 rounded text-[14px] border border-border text-txt focus:border-select focus:outline-none hover:border-hover focus:text-txtSelect" 
                          />
                        </div>

                        <div className="col-span-2">
                             <label className="text-[10px] text-txt block mb-1 uppercase">Shadow Color</label>
                             <div className="flex items-center gap-2 bg-panel p-1 rounded border border-border hover:border-hover">
                                <input 
                                type="color" 
                                value={element.shadow.color || '#000000'} 
                                onChange={(e) => handleShadowChange('color', e.target.value)} 
                                className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" 
                                />
                                <span className="text-[14px] text-txt font-mono">{element.shadow.color}</span>
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