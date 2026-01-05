
import React, { useRef, useEffect, useState } from 'react';
import { ImageSettings, DEFAULT_SETTINGS, ViewAngle, PhotographyDevice, FilterType, FocalLength } from '../types';
import { 
  SCENES, TIMES, MOODS, LIGHTING, PRO_LENSES, MOBILE_LENSES,
  ASPECT_RATIOS, VIDEO_ASPECT_RATIOS, INTERACTIONS, VIDEO_INTERACTIONS, HUMAN_STYLES, VIEW_ANGLES, 
  SHOT_SIZES, VIDEO_SHOT_SIZES, PHOTOGRAPHY_DEVICES, FILTERS 
} from '../constants';
import { Icons } from './Icon';

interface RightSidebarProps {
  settings: ImageSettings;
  onUpdateSettings: (newSettings: ImageSettings) => void;
  onGenerate: () => void;
  isProcessing: boolean;
  canGenerate: boolean;
  onClose?: () => void; 
}

// Reliable Sample image for filter preview (Product on neutral background)
const SAMPLE_PREVIEW_IMG = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80";

const RightSidebar: React.FC<RightSidebarProps> = ({
  settings,
  onUpdateSettings,
  onGenerate,
  isProcessing,
  canGenerate,
  onClose
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState(false);
  const isVideoMode = settings.model === 'veo-3.1-fast-generate-preview';
  
  // Logic to determine active lens list
  const hasProfessional = settings.photographyDevice.includes('professional');
  const isOnlyMobile = settings.photographyDevice.includes('mobile') && !hasProfessional;
  const activeLenses = isOnlyMobile ? MOBILE_LENSES : PRO_LENSES;

  // Effect to reset incompatible settings when switching devices
  useEffect(() => {
    const validMobileLenses = ['16mm', '24mm', '85mm'];
    const validProLenses = ['16mm', '50mm', '85mm'];

    const currentFocalLengths = settings.focalLength || [];
    
    // Filter out invalid lenses for current device
    const filteredLenses = currentFocalLengths.filter(lens => 
      isOnlyMobile ? validMobileLenses.includes(lens) : validProLenses.includes(lens)
    );

    // If all lenses were invalid or empty, set default
    if (filteredLenses.length === 0) {
       updateField('focalLength', isOnlyMobile ? ['24mm'] : ['50mm']);
    } else if (filteredLenses.length !== currentFocalLengths.length) {
       updateField('focalLength', filteredLenses);
    }
  }, [settings.photographyDevice]);

  // Effect to set default video aspect ratio if needed
  useEffect(() => {
    if (isVideoMode) {
      const validVideoRatios = ['9:16', '16:9', '1:1'];
      if (!validVideoRatios.includes(settings.aspectRatio)) {
        updateField('aspectRatio', '9:16');
      }
      const validVideoShots = ['full', 'medium', 'close_up'];
      if (!validVideoShots.includes(settings.shotSize)) {
        updateField('shotSize', 'medium');
      }
    }
  }, [isVideoMode]);

  const updateField = <K extends keyof ImageSettings>(field: K, value: ImageSettings[K]) => {
    onUpdateSettings({ ...settings, [field]: value });
  };

  const toggleDevice = (device: PhotographyDevice) => {
    const currentDevices = settings.photographyDevice;
    if (currentDevices.includes(device)) {
      if (currentDevices.length > 1) {
        updateField('photographyDevice', currentDevices.filter(d => d !== device));
      }
    } else {
      updateField('photographyDevice', [...currentDevices, device]);
    }
  };

  const toggleViewAngle = (angle: ViewAngle) => {
    const currentAngles = settings.viewAngle || [];
    if (currentAngles.includes(angle)) {
      if (currentAngles.length > 1) {
        updateField('viewAngle', currentAngles.filter(a => a !== angle));
      }
    } else {
      updateField('viewAngle', [...currentAngles, angle]);
    }
  };
  
  // Multi-Angle Presets
  const setMultiAnglePreset = (count: 3 | 4 | 1) => {
    if (count === 1) {
      updateField('viewAngle', ['eye_level']);
    } else if (count === 3) {
      updateField('viewAngle', ['eye_level', 'high_angle_45', 'top_down']);
    } else if (count === 4) {
      updateField('viewAngle', ['eye_level', 'high_angle_45', 'low_angle', 'top_down']);
    }
  };

  const toggleFocalLength = (lens: FocalLength) => {
    const currentLenses = settings.focalLength || [];
    if (currentLenses.includes(lens)) {
      if (currentLenses.length > 1) {
        updateField('focalLength', currentLenses.filter(l => l !== lens));
      }
    } else {
      updateField('focalLength', [...currentLenses, lens]);
    }
  };

  const updateWatermark = <K extends keyof ImageSettings['watermark']>(
    field: K, 
    value: NonNullable<ImageSettings['watermark']>[K]
  ) => {
    onUpdateSettings({
      ...settings,
      watermark: { ...(settings.watermark || DEFAULT_SETTINGS.watermark!), [field]: value }
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updateWatermark('url', reader.result as string);
        updateWatermark('enabled', true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to simulate filter look with CSS
  const getFilterStyle = (type: FilterType): React.CSSProperties => {
    switch(type) {
      case 'clean': 
        return { filter: 'brightness(1.15) contrast(0.95) saturate(1.1)' };
      case 'cinematic': 
        return { filter: 'contrast(1.25) saturate(0.9) sepia(0.15) brightness(0.9)' };
      case 'natural':
      default: 
        return { filter: 'none' };
    }
  };

  const totalRenderCount = isVideoMode 
    ? 1 
    : (settings.outputCount || 1) * (settings.viewAngle?.length || 1) * (settings.photographyDevice?.length || 1) * (settings.focalLength?.length || 1);
  
  const activeShotSizes = isVideoMode ? VIDEO_SHOT_SIZES : SHOT_SIZES;
  const activeInteractions = isVideoMode ? VIDEO_INTERACTIONS : INTERACTIONS;

  return (
    <div className="w-full md:w-80 h-full bg-lab-dark border-l border-lab-border flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="h-14 shrink-0 border-b border-lab-border flex items-center justify-between px-4 bg-lab-panel">
         <h2 className="font-bold text-sm text-white uppercase tracking-wider">
           {isVideoMode ? 'Thiết Lập Video (Veo)' : 'Bảng Điều Khiển Ảnh'}
         </h2>
         <div className="flex items-center gap-2">
            <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white p-2 active:bg-white/10 rounded-full">
                <Icons.Close className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 md:pb-4 scrollbar-thin scrollbar-thumb-lab-border">
        
        {/* --- NEW: MULTI-ANGLE BATCH RENDER SECTION --- */}
        {!isVideoMode && (
          <section className="bg-lab-panel p-3 rounded border border-lab-border animate-in slide-in-from-top-1">
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2 text-lab-yellow">
                 <Icons.Layers className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-wider">Bộ Render Đa Góc (Batch)</span>
               </div>
               
               {/* Color Sync Toggle */}
               <label className="flex items-center gap-2 cursor-pointer group" title="Bắt buộc tất cả ảnh phải có cùng tông màu/ánh sáng">
                  <span className={`text-[9px] font-bold transition-colors ${settings.isColorSync ? 'text-lab-yellow' : 'text-gray-500'}`}>
                    Đồng Bộ Màu
                  </span>
                  <div className="relative inline-flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.isColorSync} 
                      onChange={(e) => updateField('isColorSync', e.target.checked)} 
                    />
                    <div className="w-7 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-lab-yellow"></div>
                  </div>
               </label>
             </div>
             
             <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded mb-2">
                <button
                   onClick={() => setMultiAnglePreset(1)}
                   className={`py-2 text-[10px] font-bold rounded transition-all ${settings.viewAngle.length === 1 ? 'bg-lab-border text-gray-300' : 'text-gray-500 hover:text-white'}`}
                >
                   1 Góc
                </button>
                <button
                   onClick={() => setMultiAnglePreset(3)}
                   className={`py-2 text-[10px] font-bold rounded transition-all flex flex-col items-center leading-none gap-0.5 ${settings.viewAngle.length === 3 ? 'bg-lab-yellow text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                   <span>Bộ 3 Góc</span>
                   <span className="text-[8px] font-normal opacity-80">(Standard)</span>
                </button>
                <button
                   onClick={() => setMultiAnglePreset(4)}
                   className={`py-2 text-[10px] font-bold rounded transition-all flex flex-col items-center leading-none gap-0.5 ${settings.viewAngle.length === 4 ? 'bg-lab-yellow text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                   <span>Bộ 4 Góc</span>
                   <span className="text-[8px] font-normal opacity-80">(Full)</span>
                </button>
             </div>
             
             <p className="text-[9px] text-gray-400 leading-relaxed px-1">
               <span className="text-lab-yellow font-bold">Lưu ý:</span> {settings.isColorSync ? 'Hệ thống sẽ KHÓA White Balance để màu sắc đồng nhất.' : 'Màu sắc sẽ thay đổi ngẫu nhiên theo từng góc chụp.'}
             </p>
          </section>
        )}

        {/* --- VIDEO SPECIFIC CONTROLS --- */}
        {isVideoMode && (
          <section className="space-y-4 animate-in slide-in-from-right-2">
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-lab-yellow">
                  <Icons.Type className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Kịch Bản Video (Prompt)</span>
               </div>
               <textarea 
                  className="w-full bg-black border border-lab-border rounded p-3 text-xs text-white focus:border-lab-yellow outline-none h-24 resize-none placeholder-gray-600"
                  placeholder="Mô tả chuyển động: Sản phẩm xoay nhẹ 360 độ, ánh sáng lướt qua bề mặt..."
                  value={settings.videoPrompt || ''}
                  onChange={(e) => updateField('videoPrompt', e.target.value)}
               />
            </div>
            {/* Duration Slider */}
            <div className="space-y-2 bg-lab-panel p-3 rounded border border-lab-border">
                <div className="flex justify-between items-center mb-1">
                   <label className="text-xs text-gray-400 flex items-center gap-2">
                     <Icons.History className="w-3 h-3" /> Độ Dài Video
                   </label>
                   <span className="text-lab-yellow font-bold text-xs">{settings.videoDuration || 5}s</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="10" 
                  step="1" 
                  value={settings.videoDuration || 5}
                  onChange={(e) => updateField('videoDuration', parseInt(e.target.value))}
                  className="w-full accent-lab-yellow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            <div className="bg-lab-panel p-3 rounded border border-lab-border flex items-center justify-between active:bg-lab-panel/80">
              <div className="flex items-center gap-2 text-white">
                  {settings.hasVoice ? <Icons.Sun className="w-4 h-4 text-lab-yellow" /> : <Icons.EyeOff className="w-4 h-4 text-gray-500" />}
                  <span className="text-xs font-bold uppercase tracking-wider">Âm Thanh / Voiceover</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.hasVoice || false} 
                    onChange={(e) => updateField('hasVoice', e.target.checked)} 
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-lab-yellow"></div>
              </label>
            </div>
            <div className="border-t border-lab-border"></div>
          </section>
        )}

        {/* Scene Selection */}
        {!settings.isRemoveBackground || isVideoMode ? (
        <section className="space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-lab-yellow">
            <Icons.Image className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Bối Cảnh & Tương Tác</span>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-gray-400">Môi Trường</label>
            <div className="relative">
                <select 
                  className="w-full bg-lab-panel border border-lab-border rounded p-3 md:p-2.5 text-xs text-white focus:border-lab-yellow outline-none appearance-none"
                  value={settings.scene}
                  onChange={(e) => updateField('scene', e.target.value as any)}
                >
                  {SCENES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
          </div>
          
           <div className="space-y-2">
            <label className="text-xs text-gray-400">Tương Tác {isVideoMode ? '(Motion)' : '(Human)'}</label>
            <div className="relative">
                <select 
                  className="w-full bg-lab-panel border border-lab-border rounded p-3 md:p-2.5 text-xs text-white focus:border-lab-yellow outline-none appearance-none"
                  value={settings.humanInteraction}
                  onChange={(e) => updateField('humanInteraction', e.target.value as any)}
                >
                  {activeInteractions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
          </div>

          {settings.humanInteraction !== 'none' && (
             <div className="space-y-2 animate-in slide-in-from-top-1">
                <label className="text-xs text-gray-400">Phong Cách Người Mẫu</label>
                <select 
                  className="w-full bg-lab-panel border border-lab-border rounded p-3 md:p-2.5 text-xs text-white focus:border-lab-yellow outline-none"
                  value={settings.humanStyle}
                  onChange={(e) => updateField('humanStyle', e.target.value as any)}
                >
                  {HUMAN_STYLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
             </div>
          )}

           {settings.scene === 'custom' && (
             <div className="space-y-2">
                 <label className="text-xs text-gray-400">Mô Tả Bối Cảnh</label>
                 <textarea 
                   className="w-full bg-black border border-lab-border rounded p-3 text-xs text-white focus:border-lab-yellow outline-none h-20 resize-none"
                   placeholder="Mô tả bối cảnh mong muốn..."
                   value={settings.customScenePrompt || ''}
                   onChange={(e) => updateField('customScenePrompt', e.target.value)}
                 />
             </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
             <div className="space-y-1">
                <label className="text-xs text-gray-400">Thời Gian</label>
                <select 
                  className="w-full bg-lab-panel border border-lab-border rounded p-2 text-xs text-white outline-none"
                  value={settings.timeOfDay}
                  onChange={(e) => updateField('timeOfDay', e.target.value as any)}
                >
                  {TIMES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-xs text-gray-400">Cảm Xúc</label>
                <select 
                  className="w-full bg-lab-panel border border-lab-border rounded p-2 text-xs text-white outline-none"
                  value={settings.mood}
                  onChange={(e) => updateField('mood', e.target.value as any)}
                >
                  {MOODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
             </div>
          </div>
        </section>
        ) : (
          <div className="p-4 bg-lab-panel rounded border border-lab-border text-center">
            <p className="text-xs text-gray-400">Chế độ tách nền đang bật.</p>
          </div>
        )}

        {/* Camera & Lighting */}
        <section className="space-y-3 pt-4 border-t border-lab-border">
          <div className="flex items-center gap-2 text-lab-yellow">
            <Icons.Camera className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Quang Học & Ánh Sáng</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PHOTOGRAPHY_DEVICES.map(device => {
               let label = device.label;
               if (isVideoMode && device.value === 'professional') {
                 label = "Máy Quay Điện Ảnh";
               }
               const isSelected = settings.photographyDevice.includes(device.value);
               return (
                <button
                    key={device.value}
                    onClick={() => toggleDevice(device.value)}
                    className={`flex flex-col items-center justify-center p-2 rounded border transition-all active:scale-[0.98] relative ${isSelected ? 'bg-lab-yellow text-black border-lab-yellow shadow-sm' : 'bg-lab-panel border-lab-border text-gray-400 hover:border-gray-500'}`}
                >
                    {isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-black rounded-full" />}
                    <span className="text-[10px] font-bold text-center">{label}</span>
                    <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-black/70' : 'text-gray-600'}`}>{device.value === 'mobile' ? 'Social UGC' : 'Professional'}</span>
                </button>
               );
            })}
          </div>

          <div className="space-y-2">
             <label className="text-xs text-gray-400 flex items-center justify-between">
                <span>Tiêu Cự</span>
             </label>
             <div className="grid grid-cols-3 gap-2">
                {activeLenses.map(lens => {
                  const isSelected = (settings.focalLength || []).includes(lens.value);
                  return (
                    <button
                      key={lens.value}
                      onClick={() => updateField('focalLength', [lens.value])} 
                      className={`flex flex-col items-center justify-center p-2.5 rounded border transition-all touch-manipulation active:scale-95 relative
                        ${isSelected 
                          ? 'border-lab-yellow bg-lab-yellow/10 text-lab-yellow font-bold' 
                          : 'border-lab-border text-gray-400 hover:border-gray-500'
                        }
                      `}
                    >
                      <span className="text-[10px]">{lens.label}</span>
                      <span className="text-[8px] text-gray-500 hidden md:block">{lens.desc.split('.')[0]}</span>
                    </button>
                  );
                })}
             </div>
          </div>

          {/* 1. Shot Size (Cỡ Cảnh) */}
          <div className="space-y-2">
              <label className="text-xs text-gray-400">Cỡ Cảnh (Độ lớn sản phẩm)</label>
              <div className="flex flex-col gap-2">
                  {activeShotSizes.map(shot => (
                     <button
                        key={shot.value}
                        onClick={() => updateField('shotSize', shot.value)}
                        className={`text-left p-2.5 rounded border text-xs transition-all active:scale-[0.99] ${settings.shotSize === shot.value ? 'bg-lab-yellow/10 border-lab-yellow text-lab-yellow' : 'bg-lab-panel border-lab-border text-gray-400 hover:border-gray-500'}`}
                     >
                        <div className="font-bold">{shot.label}</div>
                        <div className="text-[9px] opacity-70 font-light">{shot.desc}</div>
                     </button>
                  ))}
              </div>
          </div>

          {/* 2. View Angle (Góc Chụp) - Updated for Multi-Select */}
          {!isVideoMode && (
             <div className="space-y-2">
                <label className="text-xs text-gray-400 flex items-center justify-between">
                   <span>Góc Chụp (Đa Góc)</span>
                   {settings.viewAngle.length > 1 && <span className="text-[9px] text-lab-yellow font-bold italic">{settings.viewAngle.length} góc được chọn</span>}
                </label>
                <div className="grid grid-cols-1 gap-2">
                   {VIEW_ANGLES.map(angle => {
                     const isSelected = (settings.viewAngle || []).includes(angle.value);
                     return (
                       <button
                         key={angle.value}
                         onClick={() => toggleViewAngle(angle.value)}
                         className={`text-xs py-2.5 px-3 border rounded transition-all text-left flex justify-between items-center active:scale-[0.99]
                           ${isSelected 
                             ? 'bg-lab-yellow border-lab-yellow text-black font-bold shadow-sm' 
                             : 'bg-transparent border-lab-border text-gray-400 hover:border-gray-500'
                           }
                         `}
                       >
                         <div>
                            <span className="font-bold block">{angle.label}</span>
                            <span className="text-[9px] font-normal opacity-70">{angle.desc}</span>
                         </div>
                         {isSelected && <Icons.Check className="w-3 h-3" />}
                       </button>
                     );
                   })}
                </div>
             </div>
          )}

          <div className="space-y-2">
             <label className="text-xs text-gray-400">Thiết Lập Ánh Sáng</label>
             <select 
                className="w-full bg-lab-panel border border-lab-border rounded p-3 md:p-2 text-xs text-white outline-none"
                value={settings.lighting}
                onChange={(e) => updateField('lighting', e.target.value as any)}
              >
                {LIGHTING.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>

           {/* FILTER MENU - Visual Thumbnail Layout */}
           <div className="space-y-2">
             <label className="text-xs text-gray-400 flex items-center gap-1">
                <Icons.Magic className="w-3 h-3" />
                Bộ Lọc Màu (Color Grading)
             </label>
             <div className="grid grid-cols-3 gap-2">
                {FILTERS.map(filter => (
                   <button
                     key={filter.value}
                     onClick={() => updateField('filter', filter.value)}
                     className={`relative rounded-md overflow-hidden border-2 transition-all active:scale-95 group ${settings.filter === filter.value ? 'border-lab-yellow shadow-md' : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-600'}`}
                     style={{ aspectRatio: '1/1' }}
                   >
                     {/* Base Image with CSS Filter or Fallback */}
                     {!imgError ? (
                        <img 
                            src={SAMPLE_PREVIEW_IMG} 
                            alt={filter.label}
                            className="absolute inset-0 w-full h-full object-cover transition-all"
                            style={getFilterStyle(filter.value)}
                            onError={() => setImgError(true)}
                        />
                     ) : (
                        <div 
                            className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-700 to-gray-900"
                            style={getFilterStyle(filter.value)}
                        />
                     )}

                     {/* Additional Overlays for stronger effects */}
                     {filter.value === 'cinematic' && <div className="absolute inset-0 bg-orange-500/10 mix-blend-overlay pointer-events-none" />}
                     {filter.value === 'clean' && <div className="absolute inset-0 bg-white/10 mix-blend-soft-light pointer-events-none" />}
                     
                     {/* Label Overlay */}
                     <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-black/40 backdrop-blur-[1px]">
                        <span className="text-[9px] font-bold text-white uppercase shadow-sm drop-shadow-md tracking-wider">{filter.label}</span>
                     </div>
                   </button>
                ))}
             </div>
             {/* Show Description of selected filter */}
             <p className="text-[9px] text-gray-500 text-center italic mt-1">
                {FILTERS.find(f => f.value === settings.filter)?.desc}
             </p>
          </div>

        </section>

        {/* Output & Format */}
        <section className="space-y-3 pt-4 border-t border-lab-border">
          <div className="flex items-center gap-2 text-lab-yellow">
            <Icons.Aperture className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{isVideoMode ? 'Tỉ Lệ Video (Social)' : 'Định Dạng Ảnh'}</span>
          </div>
          
           <div className="grid grid-cols-3 gap-2">
            {(isVideoMode ? VIDEO_ASPECT_RATIOS : ASPECT_RATIOS).map(ratio => (
              <button
                key={ratio.value}
                onClick={() => updateField('aspectRatio', ratio.value)}
                className={`text-[10px] py-2.5 border rounded transition-all touch-manipulation active:scale-95 ${settings.aspectRatio === ratio.value ? 'border-lab-yellow bg-lab-yellow/10 text-lab-yellow' : 'border-lab-border text-gray-400 hover:border-gray-500'}`}
              >
                {ratio.label.split(' ')[0]} {/* Show 9:16 instead of full label to fit */}
              </button>
            ))}
           </div>
           
           {!isVideoMode && (
             <div className={`pt-2 transition-opacity ${settings.model === 'gemini-3-pro-image-preview' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-lab-panel border border-transparent hover:border-lab-border transition-colors">
                  <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-lab-yellow bg-gray-700 rounded border-gray-600 focus:ring-lab-yellow"
                      checked={settings.isHighRes} 
                      onChange={(e) => updateField('isHighRes', e.target.checked)} 
                      disabled={settings.model !== 'gemini-3-pro-image-preview'}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-lab-yellow">Xuất 4K (High Res)</span>
                    <span className="text-[9px] text-gray-500">
                      {settings.model === 'gemini-3-pro-image-preview' ? 'Dành riêng cho Banana 2 (Pro)' : 'Chỉ khả dụng trên Banana 2 (Pro)'}
                    </span>
                  </div>
                </label>
             </div>
           )}
        </section>

        {/* Watermark Section ... (Kept as is) */}
        {!isVideoMode && (
          <section className="space-y-3 pt-4 border-t border-lab-border">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-lab-yellow">
                <Icons.Type className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Logo / Watermark</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.watermark?.enabled} onChange={(e) => updateWatermark('enabled', e.target.checked)} />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-lab-yellow"></div>
              </label>
            </div>

            {settings.watermark?.enabled && (
              <div className="bg-lab-panel rounded p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                 <button 
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-2.5 border border-dashed border-gray-600 rounded text-xs text-gray-400 hover:border-lab-yellow hover:text-lab-yellow transition-colors active:scale-[0.98]"
                 >
                   {settings.watermark.url ? 'Đổi Logo' : 'Tải Logo PNG'}
                 </button>
                 <input type="file" ref={logoInputRef} accept="image/png" className="hidden" onChange={handleLogoUpload} />
                 {/* Position controls ... */}
                 {settings.watermark.url && (
                   <>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase">Vị Trí</label>
                        <select 
                          className="w-full bg-black border border-lab-border rounded p-2 text-xs text-white"
                          value={settings.watermark.position}
                          onChange={(e) => updateWatermark('position', e.target.value as any)}
                        >
                          <option value="top-left">Trên Trái</option>
                          <option value="top-right">Trên Phải</option>
                          <option value="center">Giữa</option>
                          <option value="bottom-left">Dưới Trái</option>
                          <option value="bottom-right">Dưới Phải</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase">Độ Mờ</label>
                        <input 
                          type="range" min="0.1" max="1" step="0.1" 
                          value={settings.watermark.opacity}
                          onChange={(e) => updateWatermark('opacity', parseFloat(e.target.value))}
                          className="w-full accent-lab-yellow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                   </>
                 )}
              </div>
            )}
          </section>
        )}

      </div>

      <div className="p-4 border-t border-lab-border bg-lab-panel absolute bottom-0 left-0 right-0 z-10 md:static safe-area-bottom">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || isProcessing}
          className={`
            w-full py-4 md:py-3 px-4 rounded font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg
            ${isProcessing ? 'bg-lab-border text-gray-500 cursor-not-allowed' : 'bg-lab-yellow text-black hover:bg-lab-yellowHover shadow-[0_0_15px_rgba(255,215,0,0.3)]'}
          `}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              {totalRenderCount > 1 ? `Đang Xử Lý...` : 'Đang Xử Lý...'}
            </>
          ) : (
            <>
              <Icons.Magic className="w-4 h-4" />
              {isVideoMode ? `Tạo Video (${settings.videoDuration || 5}s)` : `Tạo ${totalRenderCount} Ảnh Render`}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RightSidebar;
