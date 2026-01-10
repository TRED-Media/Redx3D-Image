
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
  const calculation = PRICING_CONFIG.calculateEstimatedCost(settings);

  const costInputUSD = (calculation.totalInputTokens / 1_000_000) * pricing.INPUT;
  const costOutputUSD = (calculation.totalOutputTokens / 1_000_000) * pricing.OUTPUT;
  const costInputVND = costInputUSD * PRICING_CONFIG.VND_RATE;
  const costOutputVND = costOutputUSD * PRICING_CONFIG.VND_RATE;

  const totalUSD = costInputUSD + costOutputUSD;
  const inputPercent = totalUSD > 0 ? (costInputUSD / totalUSD) * 100 : 0;
  const outputPercent = totalUSD > 0 ? (costOutputUSD / totalUSD) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-lab-text/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content - Receipt Style */}
      <div className="relative bg-[#FFFBF0] border-4 border-lab-text rounded-sm shadow-[10px_10px_0px_#264653] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 font-mono text-lab-text transform rotate-1">
        
        {/* ZigZag Border Top (CSS Trick) */}
        <div className="h-2 w-full bg-lab-yellow/80"></div>

        {/* Header */}
        <div className="p-6 border-b-2 border-dashed border-lab-text/20 bg-lab-panel/30 flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-lab-yellow rounded-full border-2 border-lab-text text-white shadow-sm">
            <Icons.Box className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase tracking-wider vintage-font">HÓA ĐƠN DỊCH VỤ</h3>
            <p className="text-xs text-lab-muted font-bold tracking-widest mt-1">REDx 3D LABORATORY</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          <div className="flex justify-between items-end border-b-2 border-lab-text/10 pb-2">
             <span className="text-xs font-bold text-lab-muted">SẢN PHẨM / DỊCH VỤ</span>
             <span className="text-sm font-bold text-lab-yellowHover">{currentModel?.label}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-3 rounded border-2 border-lab-text/10">
                <p className="text-[10px] text-lab-muted uppercase font-bold mb-1">Số lượng Output</p>
                <p className="text-2xl font-black text-lab-text">
                    {calculation.count} 
                    <span className="text-sm font-medium ml-1 text-lab-muted">{calculation.isVideo ? 'vid' : 'img'}</span>
                </p>
             </div>
             <div className="bg-white p-3 rounded border-2 border-lab-text/10">
                <p className="text-[10px] text-lab-muted uppercase font-bold mb-1">Đơn giá</p>
                <p className="text-2xl font-black text-lab-text">${pricing.OUTPUT}<span className="text-[10px] text-lab-muted font-medium">/1M</span></p>
             </div>
          </div>

          <div className="space-y-3 pt-2">
             {/* Input Row */}
             <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-lab-muted">Chi phí Input ({calculation.totalInputTokens.toLocaleString()})</span>
                <span className="text-lab-text">{Math.round(costInputVND).toLocaleString('vi-VN')} đ</span>
             </div>
             <div className="w-full bg-lab-text/10 h-2 rounded-full border border-lab-text/10"><div className="bg-lab-light h-full rounded-full" style={{width: `${Math.max(5, inputPercent)}%`}}></div></div>

             {/* Output Row */}
             <div className="flex justify-between items-center text-xs font-medium">
                <span className="text-lab-muted">Chi phí Output ({calculation.totalOutputTokens.toLocaleString()})</span>
                <span className="text-lab-text">{Math.round(costOutputVND).toLocaleString('vi-VN')} đ</span>
             </div>
             <div className="w-full bg-lab-text/10 h-2 rounded-full border border-lab-text/10"><div className="bg-lab-yellow h-full rounded-full" style={{width: `${Math.max(5, outputPercent)}%`}}></div></div>
          </div>

          <div className="flex items-center justify-between bg-lab-yellow/10 p-4 rounded border-2 border-lab-yellow border-dashed">
             <span className="text-sm font-black text-lab-yellowHover uppercase">TỔNG THANH TOÁN</span>
             <span className="text-2xl font-black text-lab-text">~{calculation.costVND.toLocaleString('vi-VN')} đ</span>
          </div>

          <p className="text-[10px] text-lab-muted italic text-center font-medium bg-white p-2 rounded">
             *Mã giao dịch: {new Date().toLocaleTimeString()} - {new Date().toLocaleDateString()}
          </p>

        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-dashed border-lab-text/20 bg-lab-panel/30 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-white border-2 border-lab-text/10 text-lab-muted hover:text-lab-text hover:border-lab-text transition-all"
          >
            HỦY BỎ
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-lg font-bold text-sm bg-lab-yellow text-white hover:bg-lab-yellowHover border-2 border-transparent shadow-md transition-all flex items-center justify-center gap-2 active:translate-y-0.5"
          >
            <Icons.Check className="w-4 h-4" />
            XÁC NHẬN
          </button>
        </div>

      </div>
    </div>
  );
};

export default CostModal;
