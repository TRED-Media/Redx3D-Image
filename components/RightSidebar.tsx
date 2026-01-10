
import React, { useRef, useEffect, useState } from 'react';
import { ImageSettings, DEFAULT_SETTINGS, ViewAngle, PhotographyDevice, FilterType, FocalLength, AspectRatio } from '../types';
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
  
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    (settings.aspectRatio === '16:9' || settings.aspectRatio === '3:2') ? 'landscape' : 'portrait'
  );

  const isVideoMode = settings.model === 'veo-3.1-fast-generate-preview';
  const hasProfessional = settings.photographyDevice.includes('professional');
  const isOnlyMobile = settings.photographyDevice.includes('mobile') && !hasProfessional;
  const activeLenses = isOnlyMobile ? MOBILE_LENSES : PRO_LENSES;

  const isRefActive = !!settings.referenceImageUrl;
  const isStrictRefMode = isRefActive && settings.isKeepRefBackground;
  const isContextDisabled = isStrictRefMode;
  const isCustomInteractionActive = !!settings.dualImagePrompt && settings.dualImagePrompt.trim().length > 0;
  const shouldShowHumanStyle = !isRefActive;

  useEffect(() => {
    const validMobileLenses = ['16mm', '24mm', '85mm'];
    const validProLenses = ['16mm', '50mm', '85mm'];

    const currentFocalLengths = settings.focalLength || [];
    
    const filteredLenses = currentFocalLengths.filter(lens => 
      isOnlyMobile ? validMobileLenses.includes(lens) : validProLenses.includes(lens)
    );

    if (filteredLenses.length === 0) {
       updateField('focalLength', isOnlyMobile ? ['24mm'] : ['50mm']);
    } else if (filteredLenses.length !== currentFocalLengths.length) {
       updateField('focalLength', filteredLenses);
    }
  }, [settings.photographyDevice]);

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

  useEffect(() => {
     if (['16:9', '3:2'].includes(settings.aspectRatio)) {
         setOrientation('landscape');
     } else if (['9:16', '2:3', '4:5'].includes(settings.aspectRatio)) {
         setOrientation('portrait');
     }
  }, [settings.aspectRatio]);

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

  const displayedRatios = isVideoMode 
    ? VIDEO_ASPECT_RATIOS 
    : ASPECT_RATIOS.filter(r => r.group === 'both' || r.group === orientation);

  return (
    <div className="w-full lg:w-80 h-full bg-lab-dark border-l-2 border-lab-border flex flex-col overflow-hidden relative transition-colors duration-300">
      {/* Header */}
      <div className="h-14 shrink-0 border-b-2 border-lab-border flex items-center justify-between px-4 bg-lab-panel transition-colors duration-300">
         <h2 className="font-bold text-sm text-lab-text uppercase tracking-wider vintage-font">
           {isVideoMode ? 'Thiết Lập Video (Veo)' : 'Bảng Điều Khiển Ảnh'}
         </h2>
         <div className="flex items-center gap-2">
            <button onClick={onClose} className="lg:hidden text-lab-muted hover:text-lab-yellow p-2 active:bg-lab-text/10 rounded-full">
                <Icons.Close className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 md:pb-4 scrollbar-thin scrollbar-thumb-lab-yellow">
        
        {/* --- MULTI-ANGLE BATCH RENDER SECTION --- */}
        {!isVideoMode && (
          <section className={`bg-lab-input p-3 rounded-xl border-2 border-lab-border shadow-sm animate-in slide-in-from-top-1 transition-all ${isStrictRefMode ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2 text-lab-yellow">
                 <Icons.Layers className="w-4 h-4" />
                 <span className="text-[10px] font-bold uppercase tracking-wider text-lab-text">Bộ Render Đa Góc</span>
               </div>
               
               {/* Color Sync Toggle */}
               <label className="flex items-center gap-2 cursor-pointer group" title="Bắt buộc tất cả ảnh phải có cùng tông màu/ánh sáng">
                  <span className={`text-[9px] font-bold transition-colors ${settings.isColorSync ? 'text-lab-yellowHover' : 'text-lab-muted'}`}>
                    Đồng Bộ Màu
                  </span>
                  <div className="relative inline-flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.isColorSync} 
                      onChange={(e) => updateField('isColorSync', e.target.checked)} 
                    />
                    <div className="w-7 h-4 bg-lab-text/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-lab-yellow"></div>
                  </div>
               </label>
             </div>
             
             <div className="grid grid-cols-3 gap-1 bg-lab-text/5 p-1 rounded-lg mb-2 border border-lab-text/5">
                <button
                   onClick={() => setMultiAnglePreset(1)}
                   className={`py-2 text-[10px] font-bold rounded-md transition-all ${settings.viewAngle.length === 1 ? 'bg-lab-panel text-lab-text shadow-sm border border-lab-border' : 'text-lab-muted hover:text-lab-text'}`}
                >
                   1 Góc
                </button>
                <button
                   onClick={() => setMultiAnglePreset(3)}
                   className={`py-2 text-[10px] font-bold rounded-md transition-all flex flex-col items-center leading-none gap-0.5 ${settings.viewAngle.length === 3 ? 'bg-lab-yellow text-white shadow-sm' : 'text-lab-muted hover:text-lab-text'}`}
                >
                   <span>Bộ 3 Góc</span>
                   <span className="text-[8px] font-normal opacity-80">(Standard)</span>
                </button>
                <button
                   onClick={() => setMultiAnglePreset(4)}
                   className={`py-2 text-[10px] font-bold rounded-md transition-all flex flex-col items-center leading-none gap-0.5 ${settings.viewAngle.length === 4 ? 'bg-lab-yellow text-white shadow-sm' : 'text-lab-muted hover:text-lab-text'}`}
                >
                   <span>Bộ 4 Góc</span>
                   <span className="text-[8px] font-normal opacity-80">(Full)</span>
                </button>
             </div>
             
             <p className="text-[9px] text-lab-muted leading-relaxed px-1 italic">
               {isStrictRefMode ? 'Đã tắt khi dùng ảnh mẫu gốc.' : settings.isColorSync ? 'Khóa White Balance cho màu đồng nhất.' : 'Màu sắc thay đổi ngẫu nhiên.'}
             </p>
          </section>
        )}

        {/* --- VIDEO SPECIFIC CONTROLS --- */}
        {isVideoMode && (
          <section className="space-y-4 animate-in slide-in-from-right-2">
            <div className="space-y-2">
               <div className="flex items-center gap-2 text-lab-yellow">
                  <Icons.Type className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider text-lab-text">Kịch Bản Video</span>
               </div>
               <textarea 
                  className="w-full bg-lab-input border-2 border-lab-border rounded-xl p-3 text-xs text-lab-text focus:border-lab-yellow outline-none h-24 resize-none placeholder-gray-500"
                  placeholder="Mô tả chuyển động: Sản phẩm xoay nhẹ 360 độ..."
                  value={settings.videoPrompt || ''}
                  onChange={(e) => updateField('videoPrompt', e.target.value)}
               />
            </div>
            {/* Duration Slider */}
            <div className="space-y-2 bg-lab-panel p-3 rounded-xl border border-lab-border/20">
                <div className="flex justify-between items-center mb-1">
                   <label className="text-xs text-lab-muted flex items-center gap-2">
                     <Icons.History className="w-3 h-3" /> Độ Dài Video
                   </label>
                   <span className="text-lab-yellowHover font-bold text-xs">{settings.videoDuration || 5}s</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="10" 
                  step="1" 
                  value={settings.videoDuration || 5}
                  onChange={(e) => updateField('videoDuration', parseInt(e.target.value))}
                  className="w-full accent-lab-yellow h-2 bg-lab-text/20 rounded-lg appearance-none cursor-pointer"
                />
            </div>
          </section>
        )}

        {/* Scene Selection */}
        <section className={`space-y-3 animate-in slide-in-from-top-2 transition-opacity duration-300 ${isStrictRefMode ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 text-lab-yellow">
                <Icons.Image className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-lab-text">Bối Cảnh & Tương Tác</span>
             </div>
             {isStrictRefMode && <span className="text-[8px] text-white bg-lab-yellow px-1 rounded font-bold">LOCKED</span>}
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-lab-muted">Môi Trường</label>
            <div className="relative">
                <select 
                  className="w-full bg-lab-input border-2 border-lab-border rounded-lg p-3 md:p-2.5 text-xs text-lab-text focus:border-lab-yellow outline-none appearance-none font-medium shadow-sm"
                  value={settings.scene}
                  onChange={(e) => updateField('scene', e.target.value as any)}
                  disabled={isContextDisabled}
                >
                  {SCENES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
          </div>
          
           <div className={`space-y-2 transition-opacity duration-300 ${isCustomInteractionActive ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center">
                <label className="text-xs text-lab-muted">Tương Tác {isVideoMode ? '(Motion)' : '(Human)'}</label>
                {isCustomInteractionActive && <span className="text-[8px] text-lab-yellow font-bold">DÙNG MÔ TẢ RIÊNG</span>}
            </div>
            <div className="relative">
                <select 
                  className="w-full bg-lab-input border-2 border-lab-border rounded-lg p-3 md:p-2.5 text-xs text-lab-text focus:border-lab-yellow outline-none appearance-none font-medium shadow-sm"
                  value={settings.humanInteraction}
                  onChange={(e) => updateField('humanInteraction', e.target.value as any)}
                  disabled={isContextDisabled || isCustomInteractionActive}
                >
                  {activeInteractions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>
          </div>

          {(settings.humanInteraction !== 'none' || isCustomInteractionActive) && shouldShowHumanStyle && (
             <div className={`space-y-2 animate-in slide-in-from-top-1 ${isCustomInteractionActive ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="text-xs text-lab-muted">Phong Cách Người Mẫu</label>
                <select 
                  className="w-full bg-lab-input border-2 border-lab-border rounded-lg p-3 md:p-2.5 text-xs text-lab-text focus:border-lab-yellow outline-none font-medium shadow-sm"
                  value={settings.humanStyle}
                  onChange={(e) => updateField('humanStyle', e.target.value as any)}
                  disabled={isContextDisabled || isCustomInteractionActive}
                >
                  {HUMAN_STYLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
             </div>
          )}

           {settings.scene === 'custom' && (
             <div className="space-y-2">
                 <label className="text-xs text-lab-muted">Mô Tả Bối Cảnh</label>
                 <textarea 
                   className="w-full bg-lab-input border-2 border-lab-border rounded-lg p-3 text-xs text-lab-text focus:border-lab-yellow outline-none h-20 resize-none shadow-inner"
                   placeholder="Mô tả bối cảnh mong muốn..."
                   value={settings.customScenePrompt || ''}
                   onChange={(e) => updateField('customScenePrompt', e.target.value)}
                   disabled={isContextDisabled}
                 />
             </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
             <div className="space-y-1">
                <label className="text-xs text-lab-muted">Thời Gian</label>
                <select 
                  className="w-full bg-lab-input border-2 border-lab-border rounded-lg p-2 text-xs text-lab-text outline-none font-medium shadow-sm"
                  value={settings.timeOfDay}
                  onChange={(e) => updateField('timeOfDay', e.target.value as any)}
                  disabled={isContextDisabled}
                >
                  {TIMES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-xs text-lab-muted">Cảm Xúc</label>
                <select 
                  className="w-full bg-lab-input border-2 border-lab-border rounded-lg p-2 text-xs text-lab-text outline-none font-medium shadow-sm"
                  value={settings.mood}
                  onChange={(e) => updateField('mood', e.target.value as any)}
                  disabled={isContextDisabled}
                >
                  {MOODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
             </div>
          </div>
        </section>

        {/* Camera & Lighting */}
        <section className={`space-y-3 pt-4 border-t-2 border-dashed border-lab-border/20 transition-opacity duration-300 ${isStrictRefMode ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lab-yellow">
              <Icons.Camera className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-lab-text">Quang Học & Ánh Sáng</span>
            </div>
            {isStrictRefMode && <span className="text-[8px] text-white bg-lab-yellow px-1 rounded font-bold">LOCKED</span>}
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
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all active:scale-[0.98] relative ${isSelected ? 'bg-lab-panel text-lab-text border-lab-yellow shadow-[2px_2px_0px_var(--lab-yellow)]' : 'bg-lab-input border-lab-border text-lab-muted hover:border-lab-text/30'}`}
                >
                    {isSelected && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-lab-yellow rounded-full" />}
                    <span className="text-[10px] font-bold text-center">{label}</span>
                    <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-lab-text/80' : 'text-lab-muted/80'}`}>{device.value === 'mobile' ? 'Social UGC' : 'Professional'}</span>
                </button>
               );
            })}
          </div>

          <div className="space-y-2">
             <label className="text-xs text-lab-muted flex items-center justify-between">
                <span>Tiêu Cự</span>
             </label>
             <div className="grid grid-cols-3 gap-2">
                {activeLenses.map(lens => {
                  const isSelected = (settings.focalLength || []).includes(lens.value);
                  return (
                    <button
                      key={lens.value}
                      onClick={() => updateField('focalLength', [lens.value])} 
                      className={`flex flex-col items-center justify-center p-2.5 rounded-lg border-2 transition-all touch-manipulation active:scale-95 relative
                        ${isSelected 
                          ? 'border-lab-yellow bg-lab-yellow/10 text-lab-yellowHover font-bold shadow-sm' 
                          : 'border-lab-border/30 bg-lab-input text-lab-muted hover:border-lab-border'
                        }
                      `}
                    >
                      <span className="text-[10px]">{lens.label}</span>
                      <span className="text-[8px] text-lab-muted/70 hidden md:block">{lens.desc.split('.')[0]}</span>
                    </button>
                  );
                })}
             </div>
          </div>

          {/* 1. Shot Size */}
          <div className="space-y-2">
              <label className="text-xs text-lab-muted">Cỡ Cảnh</label>
              <div className="flex flex-col gap-2">
                  {activeShotSizes.map(shot => (
                     <button
                        key={shot.value}
                        onClick={() => updateField('shotSize', shot.value)}
                        className={`text-left p-2.5 rounded-lg border-2 text-xs transition-all active:scale-[0.99] ${settings.shotSize === shot.value ? 'bg-lab-light/20 border-lab-yellow text-lab-text shadow-sm' : 'bg-lab-input border-lab-border/30 text-lab-muted hover:border-lab-border'}`}
                     >
                        <div className="font-bold">{shot.label}</div>
                        <div className="text-[9px] opacity-70 font-medium">{shot.desc}</div>
                     </button>
                  ))}
              </div>
          </div>

          {/* 2. View Angle */}
          {!isVideoMode && (
             <div className="space-y-2">
                <label className="text-xs text-lab-muted flex items-center justify-between">
                   <span>Góc Chụp (Đa Góc)</span>
                   {settings.viewAngle.length > 1 && <span className="text-[9px] text-lab-yellowHover font-bold italic">{settings.viewAngle.length} góc được chọn</span>}
                </label>
                <div className="grid grid-cols-1 gap-2">
                   {VIEW_ANGLES.map(angle => {
                     const isSelected = (settings.viewAngle || []).includes(angle.value);
                     return (
                       <button
                         key={angle.value}
                         onClick={() => toggleViewAngle(angle.value)}
                         className={`text-xs py-2.5 px-3 border-2 rounded-lg transition-all text-left flex justify-between items-center active:scale-[0.99]
                           ${isSelected 
                             ? 'bg-lab-text text-white border-lab-text font-bold shadow-md' 
                             : 'bg-lab-input border-lab-border/30 text-lab-muted hover:border-lab-border'
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
             <label className="text-xs text-lab-muted">Thiết Lập Ánh Sáng</label>
             <select 
                className="w-full bg-lab-input border-2 border-lab-border rounded-lg p-3 md:p-2 text-xs text-lab-text outline-none shadow-sm"
                value={settings.lighting}
                onChange={(e) => updateField('lighting', e.target.value as any)}
                disabled={isContextDisabled}
              >
                {LIGHTING.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
          </div>

           {/* FILTER MENU */}
           <div className="space-y-2">
             <label className="text-xs text-lab-muted flex items-center gap-1">
                <Icons.Magic className="w-3 h-3" />
                Bộ Lọc Màu (Color Grading)
             </label>
             <div className="grid grid-cols-3 gap-2">
                {FILTERS.map(filter => (
                   <button
                     key={filter.value}
                     onClick={() => updateField('filter', filter.value)}
                     className={`relative rounded-lg overflow-hidden border-2 transition-all active:scale-95 group ${settings.filter === filter.value ? 'border-lab-yellow shadow-md scale-105 z-10' : 'border-transparent opacity-80 hover:opacity-100'}`}
                     style={{ aspectRatio: '1/1' }}
                     disabled={isContextDisabled}
                   >
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
                            className="absolute inset-0 w-full h-full bg-gray-200"
                        />
                     )}
                     <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-black/30 backdrop-blur-[1px]">
                        <span className="text-[9px] font-bold text-white uppercase shadow-sm drop-shadow-md tracking-wider">{filter.label}</span>
                     </div>
                   </button>
                ))}
             </div>
             <p className="text-[9px] text-lab-muted text-center italic mt-1">
                {FILTERS.find(f => f.value === settings.filter)?.desc}
             </p>
          </div>
        </section>

        {/* Output & Format */}
        <section className="space-y-3 pt-4 border-t-2 border-dashed border-lab-border/20">
          <div className="flex items-center gap-2 text-lab-yellow">
            <Icons.Aperture className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider text-lab-text">{isVideoMode ? 'Tỉ Lệ Video' : 'Định Dạng Ảnh'}</span>
          </div>
          
           {!isVideoMode ? (
              <div className="space-y-2">
                 <div className="grid grid-cols-2 gap-2 bg-lab-text/5 p-1 rounded-lg border border-lab-text/5">
                    <button 
                        onClick={() => {
                            setOrientation('portrait');
                        }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs transition-all ${orientation === 'portrait' ? 'bg-lab-input text-lab-yellowHover shadow-sm font-bold border border-gray-200' : 'text-lab-muted hover:text-lab-text'}`}
                    >
                        <Icons.Vertical className="w-4 h-4" />
                        Dọc (Vertical)
                    </button>
                    <button 
                        onClick={() => setOrientation('landscape')}
                        className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs transition-all ${orientation === 'landscape' ? 'bg-lab-input text-lab-yellowHover shadow-sm font-bold border border-gray-200' : 'text-lab-muted hover:text-lab-text'}`}
                    >
                        <Icons.Horizontal className="w-4 h-4" />
                        Ngang (Horizontal)
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-2">
                    {displayedRatios.map(ratio => (
                    <button
                        key={ratio.value}
                        onClick={() => updateField('aspectRatio', ratio.value)}
                        className={`text-[10px] py-2.5 border-2 rounded-lg transition-all touch-manipulation active:scale-95 flex flex-col items-center justify-center gap-0.5
                        ${settings.aspectRatio === ratio.value 
                            ? 'border-lab-yellow bg-lab-light/20 text-lab-yellowHover font-bold shadow-sm' 
                            : 'border-lab-border/30 bg-lab-input text-lab-muted hover:border-lab-border'
                        }`}
                    >
                        <span>{ratio.value}</span>
                        <span className="text-[8px] font-medium opacity-70 scale-90">{ratio.label.split('(')[1]?.replace(')', '') || ratio.label}</span>
                    </button>
                    ))}
                 </div>
              </div>
           ) : (
              <div className="grid grid-cols-3 gap-2">
                {displayedRatios.map(ratio => (
                <button
                    key={ratio.value}
                    onClick={() => updateField('aspectRatio', ratio.value)}
                    className={`text-[10px] py-2.5 border-2 rounded-lg transition-all touch-manipulation active:scale-95 ${settings.aspectRatio === ratio.value ? 'border-lab-yellow bg-lab-light/20 text-lab-yellowHover' : 'border-lab-border/30 bg-lab-input text-lab-muted hover:border-lab-border'}`}
                >
                    {ratio.label.split(' ')[0]}
                </button>
                ))}
              </div>
           )}
           
           {!isVideoMode && (
             <div className={`pt-2 transition-opacity ${settings.model === 'gemini-3-pro-image-preview' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-lab-input border-2 border-transparent hover:border-lab-border transition-colors">
                  <input 
                      type="checkbox" 
                      className="w-4 h-4 accent-lab-yellow bg-gray-100 rounded border-gray-300 focus:ring-lab-yellow"
                      checked={settings.isHighRes} 
                      onChange={(e) => updateField('isHighRes', e.target.checked)} 
                      disabled={settings.model !== 'gemini-3-pro-image-preview'}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-lab-yellowHover">Xuất 4K (High Res)</span>
                    <span className="text-[9px] text-lab-muted">
                      {settings.model === 'gemini-3-pro-image-preview' ? 'Giá 2026: x2 Chi Phí (FullHD: x1)' : 'Chỉ khả dụng trên Banana 2 (Pro)'}
                    </span>
                  </div>
                </label>
             </div>
           )}
        </section>

        {/* Watermark Section */}
        {!isVideoMode && (
          <section className="space-y-3 pt-4 border-t-2 border-dashed border-lab-border/20">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-lab-yellow">
                <Icons.Type className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-lab-text">Logo / Watermark</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.watermark?.enabled} onChange={(e) => updateWatermark('enabled', e.target.checked)} />
                <div className="w-9 h-5 bg-lab-text/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-lab-yellow"></div>
              </label>
            </div>

            {settings.watermark?.enabled && (
              <div className="bg-lab-input rounded-xl p-3 space-y-3 animate-in slide-in-from-top-2 duration-200 border-2 border-lab-border">
                 <button 
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-2.5 border-2 border-dashed border-lab-muted/50 rounded-lg text-xs text-lab-muted hover:border-lab-yellow hover:text-lab-yellowHover transition-colors active:scale-[0.98] bg-lab-panel"
                 >
                   {settings.watermark.url ? 'Đổi Logo' : 'Tải Logo PNG'}
                 </button>
                 <input type="file" ref={logoInputRef} accept="image/png" className="hidden" onChange={handleLogoUpload} />
                 {settings.watermark.url && (
                   <>
                      <div className="space-y-1">
                        <label className="text-[9px] text-lab-muted uppercase">Vị Trí</label>
                        <select 
                          className="w-full bg-lab-panel border-2 border-lab-border/20 rounded-lg p-2 text-xs text-lab-text shadow-sm"
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
                        <label className="text-[9px] text-lab-muted uppercase">Độ Mờ</label>
                        <input 
                          type="range" min="0.1" max="1" step="0.1" 
                          value={settings.watermark.opacity}
                          onChange={(e) => updateWatermark('opacity', parseFloat(e.target.value))}
                          className="w-full accent-lab-yellow h-2 bg-lab-text/20 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                   </>
                 )}
              </div>
            )}
          </section>
        )}

      </div>

      <div className="p-4 border-t-2 border-lab-border bg-lab-panel absolute bottom-0 left-0 right-0 z-10 lg:static safe-area-bottom">
        <button
          onClick={onGenerate}
          disabled={!canGenerate || isProcessing}
          className={`
            w-full py-4 md:py-3 px-4 rounded-xl font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md border-2 border-transparent
            ${isProcessing ? 'bg-lab-border/20 text-lab-muted cursor-not-allowed' : 'bg-lab-yellow text-white hover:bg-lab-yellowHover shadow-[4px_4px_0px_var(--lab-yellowHover)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_var(--lab-yellowHover)]'}
          `}
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
