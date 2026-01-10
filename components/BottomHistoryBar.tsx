
import React from 'react';
import { ProcessedImage } from '../types';
import { Icons } from './Icon';

interface BottomHistoryBarProps {
  history: ProcessedImage[];
  onSelectImage: (id: string) => void;
  selectedId: string | null;
  onDelete: (id: string) => void;
  onClearAll?: () => void;
  onClose?: () => void; // New prop for closing on mobile
}

const BottomHistoryBar: React.FC<BottomHistoryBarProps> = ({
  history,
  onSelectImage,
  selectedId,
  onDelete,
  onClearAll,
  onClose
}) => {
  return (
    // Vintage: Cream Background with border-top
    // OPTIMIZED HEIGHTS: 
    // - Portrait: h-44 (176px)
    // - Landscape: h-32 (128px)
    // - Desktop: h-64 (256px)
    <div className="h-44 landscape:h-32 md:h-64 w-full bg-lab-dark border-t-4 border-lab-border flex flex-col shrink-0 z-30 transition-all duration-500 ease-in-out safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
      {/* Header of Bar */}
      <div className="px-4 py-2 landscape:py-1 md:py-3 flex items-center justify-between border-b-2 border-lab-border/20 shrink-0 bg-lab-panel">
        <div className="flex items-center gap-2 text-lab-text shrink-0">
          {/* Mobile Close Button (Left) */}
          <button onClick={onClose} className="md:hidden p-1 -ml-1 text-lab-muted hover:text-lab-text">
             <Icons.Close className="w-5 h-5" />
          </button>

          <Icons.History className="w-4 h-4 md:w-4 md:h-4 text-lab-yellow hidden md:block" />
          <span className="text-xs md:text-sm font-bold uppercase tracking-wider vintage-font">Album ({history.length})</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-100 text-lab-muted hover:text-red-500 transition-all group border border-transparent hover:border-red-200"
          >
            <Icons.Trash className="w-3 h-3 md:w-4 md:h-4 group-hover:animate-bounce" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Xóa Tất Cả</span>
          </button>
        )}
      </div>

      {/* Horizontal Scroll List - Film Strip Effect */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center px-4 py-2 landscape:py-1 md:py-5 scrollbar-thin scrollbar-thumb-lab-yellow scrollbar-track-lab-dark w-full relative">
        {history.length === 0 ? (
          // FIX: Use Absolute centering to guarantee visibility regardless of parent flex quirks
          <div className="absolute inset-0 flex flex-col items-center justify-center text-lab-muted gap-1.5 opacity-70 select-none pointer-events-none">
            <div className="p-2 landscape:p-1.5 bg-lab-text/5 rounded-full border border-lab-text/5 shadow-sm">
                <Icons.Image className="w-5 h-5 landscape:w-4 landscape:h-4 md:w-8 md:h-8 opacity-50" />
            </div>
            <span className="text-[10px] landscape:text-[9px] md:text-sm font-black uppercase tracking-wide">Film roll trống...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 md:gap-6 min-w-full">
            {history.map((img) => (
              <div
                key={img.id}
                onClick={() => onSelectImage(img.id)}
                className={`
                  group relative flex-shrink-0 rounded-lg cursor-pointer overflow-hidden border-4 transition-all duration-300 ease-out bg-white
                  h-20 w-20 landscape:h-16 landscape:w-16
                  md:h-32 md:w-32 
                  active:scale-95 
                  md:hover:w-36 md:hover:scale-105 md:hover:shadow-lg hover:z-10
                  ${selectedId === img.id 
                    ? 'border-lab-yellow shadow-[4px_4px_0px_#264653] scale-105 w-22 md:w-36 rotate-1' 
                    : 'border-white opacity-90 hover:opacity-100 hover:border-lab-border/50'
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
                  <div className="absolute inset-0 bg-lab-panel/80 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="w-4 h-4 md:w-8 md:h-8 border-4 border-lab-text border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {img.status === 'failed' && (
                  <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1 bg-white rounded-full p-0.5">
                    <Icons.Alert className="w-3 h-3 md:w-5 md:h-5 text-red-500 drop-shadow-sm" />
                  </div>
                )}

                {/* Hover Delete Button (Desktop) */}
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
                  className="absolute top-0 right-0 p-1.5 md:p-2 bg-white/80 text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500 hover:text-white rounded-bl-lg"
                >
                  <Icons.Trash className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            ))}
            {/* Spacer at end of list */}
            <div className="w-4 shrink-0"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomHistoryBar;
