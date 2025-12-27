
import React from 'react';
import { ImageSettings } from '../types';
import { PRICING_CONFIG, AI_MODELS } from '../constants';
import { Icons } from './Icon';

interface CostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  settings: ImageSettings;
}

const CostModal: React.FC<CostModalProps> = ({ isOpen, onClose, onConfirm, settings }) => {
  if (!isOpen) return null;

  const currentModel = AI_MODELS.find(m => m.value === settings.model);
  const pricing = PRICING_CONFIG.getPrice(settings.model);

  // Use the centralized calculator to ensure numbers match LeftSidebar exactly
  const calculation = PRICING_CONFIG.calculateEstimatedCost(settings);

  // Derive USD costs for display breakdown
  const costInputUSD = (calculation.totalInputTokens / 1_000_000) * pricing.INPUT;
  const costOutputUSD = (calculation.totalOutputTokens / 1_000_000) * pricing.OUTPUT;
  
  const costInputVND = costInputUSD * PRICING_CONFIG.VND_RATE;
  const costOutputVND = costOutputUSD * PRICING_CONFIG.VND_RATE;

  // Percentage for progress bar visualization
  const totalUSD = costInputUSD + costOutputUSD;
  const inputPercent = totalUSD > 0 ? (costInputUSD / totalUSD) * 100 : 0;
  const outputPercent = totalUSD > 0 ? (costOutputUSD / totalUSD) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-lab-panel border border-lab-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 font-mono">
        
        {/* Header */}
        <div className="p-4 border-b border-lab-border bg-lab-dark flex items-center gap-3">
          <div className="p-2 bg-lab-yellow/10 rounded-full">
            <Icons.Box className="w-5 h-5 text-lab-yellow" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg font-sans">Báo Giá Dự Kiến</h3>
            <p className="text-xs text-lab-muted font-sans">Model: <span className="text-lab-yellow font-mono">{currentModel?.label}</span></p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-black/40 p-3 rounded border border-lab-border">
                <p className="text-xs text-gray-500 mb-1">Số lượng Output</p>
                <p className="text-xl font-bold text-white">
                    {calculation.count} 
                    <span className="text-xs font-normal ml-1">{calculation.isVideo ? 'video' : 'ảnh'}</span>
                </p>
             </div>
             <div className="bg-black/40 p-3 rounded border border-lab-border">
                <p className="text-xs text-gray-500 mb-1">Đơn giá Output</p>
                <p className="text-xl font-bold text-white">${pricing.OUTPUT}<span className="text-[10px] text-gray-500 font-normal">/1M</span></p>
             </div>
          </div>

          <div className="space-y-3 border-t border-lab-border pt-4">
             {/* Input Row */}
             <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Đầu vào ({calculation.totalInputTokens.toLocaleString()} tokens)</span>
                <span className="text-gray-300">{Math.round(costInputVND).toLocaleString('vi-VN')} đ</span>
             </div>
             <div className="w-full bg-gray-800 h-1 rounded-full"><div className="bg-blue-500 h-1 rounded-full" style={{width: `${Math.max(5, inputPercent)}%`}}></div></div>

             {/* Output Row */}
             <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Đầu ra ({calculation.totalOutputTokens.toLocaleString()} tokens)</span>
                <span className="text-gray-300">{Math.round(costOutputVND).toLocaleString('vi-VN')} đ</span>
             </div>
             <div className="w-full bg-gray-800 h-1 rounded-full"><div className="bg-lab-yellow h-1 rounded-full" style={{width: `${Math.max(5, outputPercent)}%`}}></div></div>
          </div>

          <div className="flex items-center justify-between bg-lab-yellow/10 p-4 rounded border border-lab-yellow/30">
             <span className="text-sm font-bold text-lab-yellow font-sans">TỔNG DỰ KIẾN</span>
             <span className="text-2xl font-bold text-white">~{calculation.costVND.toLocaleString('vi-VN')} đ</span>
          </div>

          <p className="text-[10px] text-gray-500 italic text-center font-sans">
             *Giá trị token dựa trên bảng giá T12/2025. Chi phí thực tế có thể thay đổi nhỏ.
          </p>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-lab-border bg-lab-dark flex gap-3 font-sans">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded font-bold text-sm bg-transparent border border-lab-border text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            Hủy Bỏ
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded font-bold text-sm bg-lab-yellow text-black hover:bg-lab-yellowHover shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <Icons.Check className="w-4 h-4" />
            Xác Nhận & Render
          </button>
        </div>

      </div>
    </div>
  );
};

export default CostModal;
