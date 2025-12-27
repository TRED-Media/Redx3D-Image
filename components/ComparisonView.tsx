
import React from 'react';
import { Icons } from './Icon';

interface ComparisonViewProps {
  originalUrl: string;
  processedUrl: string;
  onClose: () => void;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ originalUrl, processedUrl, onClose }) => {
  return (
    <div className="w-full h-full flex flex-col animate-in fade-in zoom-in duration-300 relative">
      
      {/* Responsive Grid: Rows on Mobile, Cols on Desktop */}
      <div className="flex-1 grid grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1 gap-2 md:gap-4 h-full overflow-hidden p-2 md:p-4">
        
        {/* ORIGINAL (Top on Mobile, Left on Desktop) */}
        <div className="relative flex flex-col items-center justify-center w-full h-full bg-black/40 border border-lab-border rounded-lg overflow-hidden group">
            <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur px-2 py-1 rounded text-gray-300 text-[9px] md:text-[10px] font-bold border border-white/10 uppercase tracking-wider shadow-sm">
               Ảnh Gốc
            </div>
            <img 
               src={originalUrl} 
               alt="Original" 
               className="w-full h-full object-contain p-1 md:p-2"
            />
        </div>

        {/* PROCESSED (Bottom on Mobile, Right on Desktop) */}
        <div className="relative flex flex-col items-center justify-center w-full h-full bg-black/40 border border-lab-yellow/50 rounded-lg overflow-hidden group shadow-[0_0_20px_rgba(255,215,0,0.05)]">
            <div className="absolute top-2 right-2 z-10 bg-lab-yellow/90 backdrop-blur px-2 py-1 rounded text-black text-[9px] md:text-[10px] font-bold border border-lab-yellow uppercase tracking-wider shadow-sm">
               Kết Quả AI
            </div>
             <img 
               src={processedUrl} 
               alt="Processed" 
               className="w-full h-full object-contain p-1 md:p-2"
            />
        </div>

      </div>

      {/* Close Button - Optimized position for mobile thumb reach */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 z-50">
        <button 
            onClick={onClose}
            className="p-2 bg-black/60 hover:bg-red-500 rounded-full text-white transition-colors border border-white/10 shadow-lg backdrop-blur-sm"
            title="Thoát so sánh (Esc/Y)"
        >
            <Icons.Close className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      {/* Hint Text */}
      <div className="h-6 md:h-8 flex items-center justify-center shrink-0">
         <p className="text-gray-500 text-[9px] md:text-[10px] uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full">
            {window.innerWidth < 768 ? 'Chạm nút X để đóng' : "Nhấn 'Y' hoặc nút X để đóng"}
         </p>
      </div>
    </div>
  );
};

export default ComparisonView;
