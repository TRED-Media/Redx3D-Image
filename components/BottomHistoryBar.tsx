
import React from 'react';
import { ProcessedImage } from '../types';
import { Icons } from './Icon';

interface BottomHistoryBarProps {
  history: ProcessedImage[];
  onSelectImage: (id: string) => void;
  selectedId: string | null;
  onDelete: (id: string) => void;
  onClearAll?: () => void; // Added prop
}

const BottomHistoryBar: React.FC<BottomHistoryBarProps> = ({
  history,
  onSelectImage,
  selectedId,
  onDelete,
  onClearAll
}) => {
  return (
    <div className="h-20 md:h-32 w-full bg-lab-dark/95 backdrop-blur-md border-t border-lab-border flex flex-col shrink-0 z-30 transition-all duration-500 ease-in-out safe-area-bottom">
      {/* Header of Bar */}
      <div className="px-4 py-1.5 md:py-2 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 text-lab-yellow">
          <Icons.History className="w-3 h-3" />
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Thư Viện Ảnh ({history.length})</span>
        </div>

        {/* Delete All Button */}
        {history.length > 0 && onClearAll && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử? Hành động này không thể hoàn tác.")) {
                onClearAll();
              }
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all group"
          >
            <Icons.Trash className="w-3 h-3 group-hover:animate-bounce" />
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider">Xóa Tất Cả</span>
          </button>
        )}
      </div>

      {/* Horizontal Scroll List */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-2 md:gap-3 px-4 py-2 scrollbar-thin scrollbar-thumb-lab-border scrollbar-track-transparent">
        {history.length === 0 && (
          <div className="w-full flex items-center justify-center text-gray-600 text-xs gap-2 italic">
            <Icons.Image className="w-4 h-4" />
            <span>Chưa có ảnh nào</span>
          </div>
        )}

        {history.map((img) => (
          <div
            key={img.id}
            onClick={() => onSelectImage(img.id)}
            className={`
              group relative h-12 w-12 md:h-20 md:w-20 flex-shrink-0 rounded-lg cursor-pointer overflow-hidden border-2 transition-all duration-300 ease-out
              active:scale-95 md:hover:w-24 md:hover:scale-105 md:hover:shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:z-10
              ${selectedId === img.id 
                ? 'border-lab-yellow shadow-[0_0_10px_rgba(255,215,0,0.3)] scale-105 w-14 md:w-24' 
                : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-500'
              }
            `}
          >
            <img
              src={img.processedUrl || img.originalUrl}
              alt="Thumbnail"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            {/* Status Indicators */}
            {img.status === 'processing' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                <div className="w-3 h-3 md:w-5 md:h-5 border-2 border-lab-yellow border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {img.status === 'failed' && (
              <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                 <Icons.Alert className="w-2 h-2 md:w-4 md:h-4 text-red-500 drop-shadow-md" />
              </div>
            )}

            {/* Hover Delete Button (Desktop only mostly, or long press logic ideally, but keeping simple) */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
              className="absolute top-0 right-0 p-1 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500"
            >
              <Icons.Trash className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BottomHistoryBar;
