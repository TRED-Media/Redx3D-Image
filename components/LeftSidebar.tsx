
import React, { useRef } from 'react';
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
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  onUpload,
  onClose,
  projectStats,
  settings,
  onUpdateSettings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
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
  
  // Real-time calculation using centralized logic
  const currentEst = PRICING_CONFIG.calculateEstimatedCost(settings);

  return (
    <div className="w-full h-full bg-lab-dark border-r border-lab-border flex flex-col z-20 shadow-xl relative md:w-72 font-sans">
      {/* Mobile Close Button - Larger touch target */}
      <button 
        onClick={onClose}
        className="md:hidden absolute top-2 right-2 text-gray-400 hover:text-white z-50 p-3 active:bg-white/10 rounded-full transition-colors"
      >
        <Icons.Close className="w-5 h-5" />
      </button>

      {/* Header - Logo Area */}
      <div className="h-14 shrink-0 border-b border-lab-border flex flex-row gap-3 items-center justify-start px-4 bg-lab-panel">
        <div className="relative w-8 h-8 flex-shrink-0 group cursor-default">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">
            <rect width="100" height="100" rx="15" fill="#FFD700" />
            <path 
              fill="#000000"
              d="M30 25 L70 25 L80 35 L80 45 L65 45 L65 55 L80 55 L80 75 L50 75 L40 65 L40 55 L30 55 Z"
            />
          </svg>
        </div>
        
        <div className="flex flex-col items-start justify-center">
          <span className="text-lab-yellow font-bold text-sm leading-none tracking-widest">REDx</span>
          <span className="text-white font-bold text-[10px] leading-none tracking-wider opacity-80">DESIGN LAB</span>
        </div>
      </div>

      {/* Scrollable Content Area - Safe Area for Mobile */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-lab-border pb-10">
        
        {/* Upload Button */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-24 border-2 border-dashed border-lab-border hover:border-lab-yellow hover:bg-lab-panel/50 transition-all duration-300 cursor-pointer rounded-xl flex flex-col items-center justify-center gap-2 group relative overflow-hidden active:scale-95 shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-lab-yellow/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Icons.Upload className="w-6 h-6 text-lab-muted group-hover:text-lab-yellow transition-colors" />
          <div className="text-center relative z-10">
            <p className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Tải Ảnh Lên</p>
          </div>
        </div>

        {/* 1. Model Selector */}
        <div className="space-y-2 animate-in slide-in-from-left-1 duration-300">
           <div className="flex items-center gap-2 text-lab-yellow">
              <Icons.Box className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">AI Model (Version)</span>
           </div>
           <div className="flex flex-col gap-2">
              {AI_MODELS.map(model => (
                <button
                  key={model.value}
                  onClick={() => updateModel(model.value)}
                  className={`flex flex-col items-start p-3 md:p-2 rounded border transition-all active:scale-[0.98] ${settings.model === model.value ? 'bg-lab-yellow/10 border-lab-yellow' : 'bg-lab-panel border-lab-border hover:border-gray-500'}`}
                >
                  <div className="flex items-center justify-between w-full">
                     <span className={`text-xs font-bold ${settings.model === model.value ? 'text-lab-yellow' : 'text-gray-300'}`}>
                       {model.label}
                     </span>
                     {settings.model === model.value && <div className="w-2 h-2 rounded-full bg-lab-yellow" />}
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 text-left">{model.desc}</span>
                </button>
              ))}
           </div>
        </div>

        {/* 2. Variant Menu */}
        <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
           <div className="flex items-center gap-2 text-lab-yellow">
              <Icons.Layers className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Số biến thể (Mỗi góc)</span>
           </div>
           <div className="flex bg-lab-panel rounded p-1 border border-lab-border w-full">
              {OUTPUT_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => updateOutputCount(count)}
                  className={`flex-1 text-xs py-2 md:py-1.5 rounded transition-all font-mono active:scale-95 ${settings.outputCount === count ? 'bg-lab-yellow text-black font-bold shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  {count}x
                </button>
              ))}
           </div>
        </div>

        {/* 3. Product Details */}
        <div className="space-y-2 animate-in slide-in-from-left-3 duration-300">
          <div className="flex items-center gap-2 text-lab-yellow">
             <Icons.Check className="w-3 h-3" />
             <span className="text-[10px] font-bold uppercase tracking-wider">Chi Tiết Sản Phẩm</span>
          </div>
          <textarea 
            className="w-full bg-lab-panel border border-lab-border rounded p-3 text-xs text-white focus:border-lab-yellow outline-none h-20 resize-none placeholder-gray-600 leading-relaxed font-sans"
            placeholder="Vd: Chai nước hoa 50ml vỏ thủy tinh, nắp gỗ..."
            value={settings.productDescription || ''}
            onChange={(e) => updateField('productDescription', e.target.value)}
          />
        </div>

        {/* 4. Background Removal */}
        {settings.model !== 'veo-3.1-fast-generate-preview' && (
          <div className="bg-lab-panel p-3 rounded border border-lab-border flex items-center justify-between animate-in slide-in-from-left-4 duration-300 active:bg-lab-panel/80">
            <div className="flex items-center gap-2 text-white">
                <Icons.EyeOff className="w-3 h-3 text-lab-yellow" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Chỉ Tách Nền Trắng</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.isRemoveBackground} 
                  onChange={(e) => updateField('isRemoveBackground', e.target.checked)} 
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-lab-yellow"></div>
            </label>
          </div>
        )}

        <div className="border-t border-lab-border" />
        
        {/* MERGED COST SECTION: Live Est + Historical Stats */}
        <div className="w-full bg-lab-yellow/5 border border-lab-yellow/20 rounded-lg overflow-hidden animate-in fade-in">
           {/* Top: Live Estimation */}
           <div className="p-3 space-y-2 bg-lab-yellow/10">
              <div className="flex items-center gap-2 text-lab-yellow pb-1 mb-1 border-b border-lab-yellow/20">
                 <Icons.Sun className="w-3 h-3" />
                 <span className="font-bold tracking-wider uppercase text-[10px]">CHI PHÍ DỰ KIẾN (LIVE)</span>
              </div>
              
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                 <span>Số lượng:</span>
                 <span className="text-white">
                   {currentEst.count} {currentEst.isVideo ? 'video' : 'ảnh'}
                   {currentEst.isVideo && ` (${settings.videoDuration}s)`}
                 </span>
              </div>
              <div className="flex justify-between items-center font-mono">
                 <span className="text-[10px] text-gray-400">Đơn giá:</span>
                 <span className="font-bold text-lab-yellow text-xs">
                   {currentEst.costVND.toLocaleString('vi-VN')} đ
                 </span>
              </div>
           </div>
           
           {/* Bottom: Total Spent (Merged) */}
           <div className="p-3 bg-black/40 border-t border-lab-yellow/10 space-y-1">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                 <Icons.History className="w-3 h-3" />
                 <span className="font-bold tracking-wider uppercase text-[9px]">TỔNG ĐÃ CHI (T12/2025)</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                 <span>Đã tạo:</span>
                 <span className="text-gray-400">{projectStats.totalImagesGenerated} items</span>
              </div>
              <div className="flex justify-between items-center font-mono">
                 <span className="text-[10px] text-gray-500">Tổng phí:</span>
                 <span className="font-bold text-gray-300 text-xs">
                   {totalCostVND.toLocaleString('vi-VN')} đ
                 </span>
              </div>
           </div>
        </div>

      </div>
      
      <div className="p-3 border-t border-lab-border text-[9px] text-center text-gray-600 bg-lab-dark shrink-0 safe-area-bottom font-mono">
        v3.3.0 • {settings.model === 'gemini-3-pro-image-preview' ? 'Banana 2 (Pro)' : 'Nano Banana'}
      </div>

      <input 
        type="file" 
        multiple 
        accept="image/png, image/jpeg, image/jpg"
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default LeftSidebar;
