
import React, { useRef, useState } from 'react';
import { ProcessedImage, ProjectStats, ImageSettings, AIModelId } from '../types';
import { Icons } from './Icon';
import { PRICING_CONFIG, OUTPUT_COUNTS, AI_MODELS } from '../constants';

interface LeftSidebarProps {
  history: ProcessedImage[];
  onUpload: (files: FileList) => void;
  onSelectImage: (id: string) => void;
  selectedId: string | null;
  onDelete: (id: string) => void;
  onClose?: () => void;
  projectStats: ProjectStats;
  settings: ImageSettings;
  onUpdateSettings: (newSettings: ImageSettings) => void;
  onResetStats?: () => void; // New Reset Prop
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  onUpload,
  onClose,
  projectStats,
  settings,
  onUpdateSettings,
  onResetStats,
  isDarkMode,
  onToggleTheme
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null); // New Ref for Reference Image
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRefImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
         onUpdateSettings({
            ...settings,
            referenceImageUrl: reader.result as string,
            isKeepRefBackground: true // Default to keeping background
         });
      };
      reader.readAsDataURL(file);
    }
    if (refImageInputRef.current) refImageInputRef.current.value = '';
  };

  const removeRefImage = () => {
    onUpdateSettings({
        ...settings,
        referenceImageUrl: undefined,
        dualImagePrompt: '',
        isKeepRefBackground: true
    });
  };

  const updateField = <K extends keyof ImageSettings>(field: K, value: ImageSettings[K]) => {
    onUpdateSettings({ ...settings, [field]: value });
  };

  const updateOutputCount = (count: number) => {
    onUpdateSettings({ ...settings, outputCount: count });
  };

  const updateModel = (model: AIModelId) => {
    onUpdateSettings({ ...settings, model: model });
  };

  const totalCostVND = Math.round(projectStats.totalCost * PRICING_CONFIG.VND_RATE);
  const currentEst = PRICING_CONFIG.calculateEstimatedCost(settings);

  return (
    <div className="w-full h-full bg-lab-dark border-r-2 border-lab-border flex flex-col z-20 shadow-xl relative lg:w-80 font-sans text-lab-text transition-colors duration-300">
      {/* Mobile/Tablet Close Button */}
      <button 
        onClick={onClose}
        className="lg:hidden absolute top-2 right-2 text-lab-muted hover:text-lab-yellow z-50 p-3 active:bg-lab-text/10 rounded-full transition-colors"
      >
        <Icons.Close className="w-5 h-5" />
      </button>

      {/* Header - Logo Removed, Text Only */}
      <div className="h-20 landscape:h-16 md:h-24 shrink-0 border-b-2 border-lab-border flex flex-col items-center justify-center px-4 bg-lab-dark shadow-sm relative transition-colors duration-300">
        <div className="flex flex-col items-center justify-center">
          <span className="text-lab-text font-black text-3xl landscape:text-2xl md:text-3xl leading-none tracking-widest vintage-font drop-shadow-sm">REDx</span>
          <span className="text-lab-muted font-extrabold text-[11px] md:text-[12px] leading-none tracking-[0.35em] mt-1 pl-1">3D LABORATORY</span>
        </div>
        
        {/* Theme Toggle Button - Absolute Top Left */}
        {onToggleTheme && (
           <button 
             onClick={onToggleTheme}
             className="absolute top-4 left-4 p-2 rounded-full text-lab-muted hover:text-lab-yellow active:scale-90 transition-all hover:bg-lab-panel"
             title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
           >
             {isDarkMode ? <Icons.Sun className="w-4 h-4" /> : <Icons.Moon className="w-4 h-4" />}
           </button>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-lab-yellow pb-10 bg-lab-dark transition-colors duration-300">
        
        {/* Upload Button - Tactile Card Style */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-auto min-h-[7rem] landscape:min-h-[6rem] py-6 landscape:py-4 border-2 border-dashed border-lab-muted hover:border-lab-yellow hover:bg-lab-input transition-all duration-300 cursor-pointer rounded-2xl flex flex-col items-center justify-center gap-3 group relative overflow-hidden active:scale-95 shrink-0 shadow-sm hover:shadow-md"
        >
          <div className="p-3 bg-lab-panel rounded-full group-hover:bg-lab-yellow group-hover:text-white transition-colors duration-300 shadow-sm border-2 border-lab-border/10">
             <Icons.Upload className="w-6 h-6 text-lab-text group-hover:text-white" />
          </div>
          <div className="text-center relative z-10 px-2">
            <p className="text-sm font-black text-lab-text group-hover:text-lab-yellowHover transition-colors uppercase tracking-wide">Tải Ảnh Sản Phẩm</p>
            <p className="text-[10px] text-lab-muted mt-1 font-bold opacity-80">(Input 1 - Master Asset)</p>
          </div>
        </div>

        {/* 1. Model Selector */}
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-lab-yellow">
              <Icons.Box className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-wider text-lab-text">AI Model (Version)</span>
           </div>
           <div className="flex flex-col gap-2">
              {AI_MODELS.map(model => (
                <button
                  key={model.value}
                  onClick={() => updateModel(model.value)}
                  className={`flex flex-col items-start p-3 md:p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${settings.model === model.value ? 'bg-lab-panel border-lab-yellow shadow-[2px_2px_0px_var(--lab-yellow)]' : 'bg-lab-input border-lab-border hover:border-lab-text/50'}`}
                >
                  <div className="flex items-center justify-between w-full">
                     <span className={`text-xs font-black ${settings.model === model.value ? 'text-lab-yellowHover' : 'text-lab-text'}`}>
                       {model.label}
                     </span>
                     {settings.model === model.value && <div className="w-2.5 h-2.5 rounded-full bg-lab-yellow" />}
                  </div>
                  <span className="text-[10px] text-lab-muted mt-1 text-left leading-tight font-bold opacity-90">{model.desc}</span>
                </button>
              ))}
           </div>
        </div>

        {/* --- DUAL IMAGE INPUT (REFERENCE) --- */}
        <div className="space-y-2 bg-lab-panel p-3 rounded-xl border-2 border-lab-border">
            <div className="flex items-center justify-between text-lab-text">
                <div className="flex items-center gap-2">
                    <Icons.Layers className="w-4 h-4" />
                    <span className="text-[11px] font-black uppercase tracking-wider">Hợp nhất 2 ảnh (Input 2)</span>
                </div>
                {settings.referenceImageUrl && (
                    <button onClick={removeRefImage} className="text-[10px] text-red-600 hover:underline font-black">XÓA</button>
                )}
            </div>

            {!settings.referenceImageUrl ? (
                <div 
                    onClick={() => refImageInputRef.current?.click()}
                    className="w-full h-16 border-2 border-dashed border-lab-muted/40 hover:border-lab-yellow hover:bg-lab-input transition-all cursor-pointer rounded-lg flex items-center justify-center gap-2"
                >
                    <Icons.Image className="w-4 h-4 text-lab-muted" />
                    <span className="text-[11px] text-lab-muted font-bold">Chọn ảnh Người / Mẫu (Tùy chọn)</span>
                </div>
            ) : (
                <>
                <div className="relative w-full h-24 rounded-lg overflow-hidden border-2 border-lab-yellow group shadow-sm">
                     <img src={settings.referenceImageUrl} alt="Reference" className="w-full h-full object-cover" />
                     <div className="absolute bottom-0 left-0 right-0 bg-lab-text/80 p-1 text-center backdrop-blur-sm">
                        <span className="text-[10px] text-white font-bold">Input 2: Người dùng</span>
                     </div>
                </div>

                {/* KEEP BACKGROUND TOGGLE */}
                <div className="flex items-center justify-between pt-2 border-t border-lab-text/10 mt-2">
                     <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-lab-text">Giữ nguyên Bối Cảnh</span>
                        <span className="text-[9px] text-lab-muted font-bold opacity-80">{settings.isKeepRefBackground ? 'Đóng băng menu Bối cảnh/Sáng' : 'Thay nền mới & Relight'}</span>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings.isKeepRefBackground} 
                            onChange={(e) => updateField('isKeepRefBackground', e.target.checked)} 
                        />
                        <div className="w-7 h-4 bg-lab-text/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-lab-yellow"></div>
                    </label>
                </div>
                </>
            )}
            
            {settings.referenceImageUrl && (
                <div className="space-y-1 pt-2 animate-in slide-in-from-top-2">
                    <label className="text-[10px] text-lab-muted uppercase font-black">Mô tả tương tác (Prompt):</label>
                    <textarea 
                        className="w-full bg-lab-input border-2 border-lab-border rounded-lg p-2 text-xs text-lab-text font-bold focus:border-lab-yellow outline-none h-16 resize-none placeholder-gray-500"
                        placeholder="Vd: Người đang cầm sản phẩm..."
                        value={settings.dualImagePrompt || ''}
                        onChange={(e) => updateField('dualImagePrompt', e.target.value)}
                    />
                </div>
            )}
        </div>

        {/* 2. Variant Menu */}
        <div className="space-y-2">
           <div className="flex items-center gap-2 text-lab-yellow">
              <Icons.Layers className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-wider text-lab-text">Số biến thể (Mỗi góc)</span>
           </div>
           <div className="flex bg-lab-input rounded-xl p-1 border-2 border-lab-border w-full shadow-inner">
              {OUTPUT_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => updateOutputCount(count)}
                  className={`flex-1 text-xs py-2 md:py-1.5 rounded-lg transition-all font-black active:scale-95 ${settings.outputCount === count ? 'bg-lab-yellow text-white shadow-sm' : 'text-lab-muted hover:text-lab-text hover:bg-lab-panel'}`}
                >
                  {count}x
                </button>
              ))}
           </div>
        </div>

        {/* 3. Product Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-lab-yellow">
             <Icons.Check className="w-4 h-4" />
             <span className="text-[11px] font-black uppercase tracking-wider text-lab-text">Chi Tiết Sản Phẩm (Input 1)</span>
          </div>
          <textarea 
            className="w-full bg-lab-input border-2 border-lab-border rounded-xl p-3 text-xs text-lab-text font-bold focus:border-lab-yellow outline-none h-20 resize-none placeholder-gray-500 leading-relaxed font-sans shadow-inner"
            placeholder="Vd: Chai nước hoa 50ml vỏ thủy tinh, nắp gỗ..."
            value={settings.productDescription || ''}
            onChange={(e) => updateField('productDescription', e.target.value)}
          />
        </div>

        {/* 4. Background Removal */}
        {settings.model !== 'veo-3.1-fast-generate-preview' && (
          <div className={`bg-lab-panel p-3 rounded-xl border-2 border-lab-border flex items-center justify-between ${settings.referenceImageUrl && settings.isKeepRefBackground ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center gap-2 text-lab-text">
                <Icons.EyeOff className="w-4 h-4 text-lab-yellow" />
                <span className="text-[11px] font-black uppercase tracking-wider">Chỉ Tách Nền Trắng</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.isRemoveBackground} 
                  onChange={(e) => updateField('isRemoveBackground', e.target.checked)}
                  disabled={!!settings.referenceImageUrl && settings.isKeepRefBackground} 
              />
              <div className="w-9 h-5 bg-lab-text/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-lab-yellow"></div>
            </label>
          </div>
        )}

        <div className="border-t-2 border-dashed border-lab-border/20" />
        
        {/* MERGED COST SECTION: Live Est + Historical Stats */}
        <div className="w-full bg-lab-light/10 border-2 border-lab-light/30 rounded-xl overflow-hidden shadow-sm">
           {/* Top: Live Estimation */}
           <div className="p-3 space-y-2 bg-lab-light/20">
              <div className="flex items-center gap-2 text-lab-text pb-1 mb-1 border-b border-lab-text/10">
                 <Icons.Sun className="w-4 h-4 text-lab-yellow" />
                 <span className="font-black tracking-wider uppercase text-[11px]">CHI PHÍ DỰ KIẾN (LIVE)</span>
              </div>
              
              <div className="flex justify-between items-center text-[11px] text-lab-muted font-bold">
                 <span>Số lượng:</span>
                 <span className="text-lab-text font-black">
                   {currentEst.count} {currentEst.isVideo ? 'video' : 'ảnh'}
                   {currentEst.isVideo && ` (${settings.videoDuration}s)`}
                 </span>
              </div>
              <div className="flex justify-between items-center font-bold">
                 <span className="text-[11px] text-lab-muted">Đơn giá:</span>
                 <span className="font-black text-lab-yellowHover text-xs">
                   {currentEst.costVND.toLocaleString('vi-VN')} đ
                 </span>
              </div>
           </div>
           
           {/* Bottom: Total Spent (Merged) */}
           <div 
             className="p-3 bg-lab-input border-t border-lab-border/20 space-y-1 cursor-pointer hover:bg-lab-panel transition-colors"
             onClick={() => setShowBreakdown(!showBreakdown)}
           >
              <div className="flex items-center justify-between text-lab-muted mb-1">
                 <div className="flex items-center gap-2">
                    <Icons.History className="w-4 h-4" />
                    <span className="font-black tracking-wider uppercase text-[10px]">TỔNG CHI TÍCH LŨY</span>
                 </div>
                 <Icons.Settings className="w-3 h-3 opacity-50" />
              </div>
              <div className="flex justify-between items-center text-[11px] text-lab-muted font-bold">
                 <span>Đã tạo:</span>
                 <span className="text-lab-text font-black">{projectStats.totalImagesGenerated} items</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                 <span className="text-[11px] text-lab-muted">Tổng phí:</span>
                 <span className="font-black text-lab-text text-xs">
                   {totalCostVND.toLocaleString('vi-VN')} đ
                 </span>
              </div>

              {/* DETAIL BREAKDOWN */}
              {showBreakdown && projectStats.modelCounts && (
                <div className="mt-3 pt-2 border-t border-lab-border/10 space-y-1 animate-in slide-in-from-top-1">
                   <div className="flex justify-between text-[10px] text-lab-muted font-bold">
                     <span>Veo (Video):</span>
                     <span className="text-lab-text font-black">{projectStats.modelCounts['veo-3.1-fast-generate-preview'] || 0}</span>
                   </div>
                   <div className="flex justify-between text-[10px] text-lab-muted font-bold">
                     <span>Banana 2 (Pro):</span>
                     <span className="text-lab-text font-black">{projectStats.modelCounts['gemini-3-pro-image-preview'] || 0}</span>
                   </div>
                   <div className="flex justify-between text-[10px] text-lab-muted font-bold">
                     <span>Nano (Flash):</span>
                     <span className="text-lab-text font-black">{projectStats.modelCounts['gemini-2.5-flash-image'] || 0}</span>
                   </div>
                   
                   {/* RESET BUTTON */}
                   {onResetStats && (
                     <button 
                       onClick={(e) => { e.stopPropagation(); onResetStats(); }}
                       className="w-full mt-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 border border-red-200 rounded text-[10px] uppercase font-black transition-colors"
                     >
                       Reset Thống Kê
                     </button>
                   )}
                </div>
              )}
           </div>
        </div>

      </div>
      
      <div className="p-3 border-t-2 border-lab-border bg-lab-panel text-center text-lab-muted shrink-0 safe-area-bottom font-mono flex flex-col items-center justify-center gap-1 transition-colors duration-300">
        <div className="text-[10px] font-bold">v3.3.0 • {settings.model === 'gemini-3-pro-image-preview' ? 'Banana 2 (Pro)' : 'Nano Banana'}</div>
        <div className="text-[9px] font-black uppercase opacity-70">Phần mềm thuộc bản quyền của T-Red Media (tred.vn)</div>
      </div>

      <input 
        type="file" 
        multiple 
        accept="image/png, image/jpeg, image/jpg"
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {/* Hidden Ref Image Input */}
      <input 
        type="file" 
        accept="image/png, image/jpeg, image/jpg"
        className="hidden" 
        ref={refImageInputRef}
        onChange={handleRefImageChange}
      />
    </div>
  );
};

export default LeftSidebar;
