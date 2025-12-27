
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import BottomHistoryBar from './components/BottomHistoryBar';
import CostModal from './components/CostModal';
import ComparisonView from './components/ComparisonView';
import { ProcessedImage, ImageSettings, DEFAULT_SETTINGS, ProjectStats } from './types';
import { generateProductImage, generateProductVideo } from './services/geminiService';
import { fileToBase64, applyWatermark, downloadImage } from './utils/imageUtils';
import { Icons } from './components/Icon';
import { PRICING_CONFIG } from './constants';

// Local definition to avoid conflict with global Window interface
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

const App: React.FC = () => {
  const [history, setHistory] = useState<ProcessedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_SETTINGS);
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  
  // States
  const [projectStats, setProjectStats] = useState<ProjectStats>({
    totalImagesGenerated: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0
  });
  const [showCostModal, setShowCostModal] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  const selectedImage = history.find(img => img.id === selectedId);
  const isProcessing = processingQueue.length > 0;

  // -- Keyboard Shortcut for Comparison --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'y') {
        if (selectedImage?.status === 'completed' && !selectedImage.isVideo) {
           setIsComparisonMode(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

  // -- Handlers --
  const handleUpload = async (files: FileList) => {
    const newImages: ProcessedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await fileToBase64(file);
        newImages.push({
          id: uuidv4(),
          originalUrl: base64,
          timestamp: Date.now(),
          status: 'idle'
        });
      } catch (err) {
        console.error("Failed to read file", file.name, err);
      }
    }
    setHistory(prev => [...newImages, ...prev]);
    if (newImages.length > 0 && !selectedId) {
      setSelectedId(newImages[0].id);
    }
    setIsLeftOpen(false); // Close sidebar on mobile after upload interaction
  };

  const handleDelete = (id: string) => {
    setHistory(prev => prev.filter(img => img.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleGenerateClick = () => {
    if (!selectedImage) return;
    setIsRightOpen(false); // Close sidebar on mobile
    setShowCostModal(true);
  };

  const handleConfirmGenerate = async () => {
    // 1. Mandatory API Key Check for Premium Models (Veo & Gemini 3 Pro)
    // This fixes the 403 PERMISSION_DENIED error by ensuring a paid key is selected.
    const aistudio = (window as any).aistudio as AIStudio | undefined;

    if (aistudio && (settings.model === 'veo-3.1-fast-generate-preview' || settings.model === 'gemini-3-pro-image-preview')) {
        try {
            const hasKey = await aistudio.hasSelectedApiKey();
            if (!hasKey) {
                await aistudio.openSelectKey();
            }
        } catch (e) {
            console.error("Failed to verify API Key selection:", e);
        }
    }

    setShowCostModal(false);
    if (!selectedImage) return;

    // Pricing Logic
    const pricing = PRICING_CONFIG.getPrice(settings.model);
    // For Video, we force 1 output per request usually
    const countPerAngle = settings.model === 'veo-3.1-fast-generate-preview' ? 1 : (settings.outputCount || 1);
    const numberOfAngles = settings.model === 'veo-3.1-fast-generate-preview' ? 1 : (settings.viewAngle?.length || 1);
    // Updated: Count devices
    const numberOfDevices = settings.model === 'veo-3.1-fast-generate-preview' ? 1 : (settings.photographyDevice?.length || 1);
    
    const totalExpected = countPerAngle * numberOfAngles * numberOfDevices;

    const estInput = (PRICING_CONFIG.EST_INPUT_IMAGE_TOKENS + PRICING_CONFIG.EST_INPUT_TEXT_TOKENS);
    const estOutput = PRICING_CONFIG.EST_OUTPUT_TOKENS_PER_IMAGE;
    const estCost = ((estInput / 1_000_000) * pricing.INPUT) + 
                    ((estOutput / 1_000_000) * pricing.OUTPUT);

    const newProcessingIds: string[] = [];
    for (let i = 0; i < totalExpected; i++) {
        newProcessingIds.push(uuidv4());
    }

    const newEntries: ProcessedImage[] = newProcessingIds.map(id => ({
      id,
      originalUrl: selectedImage.originalUrl,
      timestamp: Date.now(),
      status: 'processing',
      settingsUsed: { ...settings },
      // Initialize video flag based on model
      isVideo: settings.model === 'veo-3.1-fast-generate-preview',
      costData: {
          estimatedInputTokens: estInput,
          estimatedOutputTokens: estOutput,
          estimatedCost: estCost,
          actualInputTokens: 0,
          actualOutputTokens: 0,
          actualCost: 0,
          variancePercent: 0
      }
    }));

    setHistory(prev => [...newEntries, ...prev]);
    if (newProcessingIds.length > 0) setSelectedId(newProcessingIds[0]);
    setProcessingQueue(prev => [...prev, ...newProcessingIds]);

    try {
      let generatedResults;
      
      // BRANCH: VIDEO vs IMAGE
      if (settings.model === 'veo-3.1-fast-generate-preview') {
         generatedResults = await generateProductVideo(selectedImage.originalUrl, settings);
      } else {
         generatedResults = await generateProductImage(selectedImage.originalUrl, settings);
      }
      
      const updates = new Map<string, Partial<ProcessedImage>>();
      let batchInputTokens = 0;
      let batchOutputTokens = 0;
      let batchCost = 0;

      for (let i = 0; i < newProcessingIds.length; i++) {
        const pid = newProcessingIds[i];
        if (i < generatedResults.length) {
            const result = generatedResults[i];
            let finalUrl = result.imageUrl;
            
            // Apply watermark only if it's an image (canvas watermarking doesn't support video easily in client)
            if (!result.isVideo && settings.watermark?.enabled && settings.watermark.url) {
                finalUrl = await applyWatermark(finalUrl, settings.watermark);
            }

            const actualInputCost = (result.usage.inputTokens / 1_000_000) * pricing.INPUT;
            const actualOutputCost = (result.usage.outputTokens / 1_000_000) * pricing.OUTPUT;
            const totalActualCost = actualInputCost + actualOutputCost;

            batchInputTokens += result.usage.inputTokens;
            batchOutputTokens += result.usage.outputTokens;
            batchCost += totalActualCost;

            const variance = ((totalActualCost - estCost) / estCost) * 100;
            updates.set(pid, { 
                status: 'completed', 
                processedUrl: finalUrl,
                isVideo: result.isVideo,
                costData: {
                    estimatedInputTokens: estInput,
                    estimatedOutputTokens: estOutput,
                    estimatedCost: estCost,
                    actualInputTokens: result.usage.inputTokens,
                    actualOutputTokens: result.usage.outputTokens,
                    actualCost: totalActualCost,
                    variancePercent: variance
                }
            });
        } else {
             updates.set(pid, { status: 'failed', error: "API did not return enough results" });
        }
      }

      setHistory(prev => prev.map(img => updates.has(img.id) ? { ...img, ...updates.get(img.id) } : img));

      setProjectStats(prev => ({
        totalImagesGenerated: prev.totalImagesGenerated + generatedResults.length,
        totalInputTokens: prev.totalInputTokens + batchInputTokens,
        totalOutputTokens: prev.totalOutputTokens + batchOutputTokens,
        totalCost: prev.totalCost + batchCost
      }));

    } catch (error: any) {
      console.error("Generation Error:", error);
      
      // Auto-trigger Key Selection again if we hit 403 or Not Found
      if (aistudio && (error.message?.includes("403") || error.message?.includes("not found"))) {
        try {
            await aistudio.openSelectKey();
        } catch (e) { /* ignore */ }
      }

      setHistory(prev => prev.map(img => newProcessingIds.includes(img.id) ? { ...img, status: 'failed', error: error.message } : img));
    } finally {
      setProcessingQueue(prev => prev.filter(id => !newProcessingIds.includes(id)));
    }
  };

  const handleDownload = (img: ProcessedImage) => {
    if (img.processedUrl) {
       const ext = img.isVideo ? 'mp4' : 'png';
       downloadImage(img.processedUrl, `REDX-LAB-${img.id}.${ext}`);
    }
    else downloadImage(img.originalUrl, `REDX-ORIGINAL-${img.id}.png`);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-black text-white font-sans overflow-hidden">
      
      {/* Mobile Header */}
      <div className="md:hidden h-14 bg-lab-dark border-b border-lab-border flex items-center justify-between px-3 z-40 shrink-0 shadow-md">
         <button onClick={() => setIsLeftOpen(true)} className="p-2 -ml-2 text-lab-yellow active:scale-95 transition-transform"><Icons.Layers className="w-6 h-6" /></button>
         <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 bg-lab-yellow rounded flex items-center justify-center"><span className="text-black font-bold text-[10px]">R</span></div>
            <span className="text-white text-xs font-bold tracking-wider">REDx 3D</span>
         </div>
         <button onClick={() => setIsRightOpen(true)} className="p-2 -mr-2 text-lab-yellow relative active:scale-95 transition-transform">
            <Icons.Settings className="w-6 h-6" />
            {selectedImage && selectedImage.status !== 'processing' && (
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-lab-dark"></span>
            )}
         </button>
      </div>

      {/* Mobile Backdrop */}
      {(isLeftOpen || isRightOpen) && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity animate-in fade-in" 
          onClick={() => { setIsLeftOpen(false); setIsRightOpen(false); }} 
        />
      )}

      {/* Left Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[85%] sm:w-80 transform transition-transform duration-300 ease-out md:relative md:translate-x-0 md:w-auto shadow-2xl ${isLeftOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <LeftSidebar 
          history={history} onUpload={handleUpload} onSelectImage={setSelectedId} selectedId={selectedId} onDelete={handleDelete} onClose={() => setIsLeftOpen(false)} projectStats={projectStats} settings={settings} onUpdateSettings={setSettings}
        />
      </div>

      <main className="flex-1 bg-lab-black relative flex flex-col min-w-0 h-full">
        {/* Top Toolbar (Desktop) / Info Bar (Mobile) */}
        <div className="h-10 md:h-14 shrink-0 border-b border-lab-border flex items-center justify-between px-4 md:px-6 bg-lab-black/80 backdrop-blur-md z-10 relative">
          <div className="flex items-center gap-4 w-1/3">
             {selectedImage && (
               <span className="text-[10px] md:text-xs text-lab-muted font-mono uppercase tracking-widest animate-in fade-in slide-in-from-left-2 truncate">
                 ID: <span className="text-lab-yellow">{selectedImage.id.substring(0, 8)}</span>
               </span>
             )}
          </div>
          
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none w-full justify-center">
             <h1 className="hidden md:flex items-center gap-2 text-sm font-bold tracking-tight text-white uppercase opacity-80">
                Thay nền sản phẩm cùng <span className="text-lab-yellow">REDx 3D Lab</span>
             </h1>
          </div>

          <div className="flex items-center justify-end gap-2 w-1/3">
             {selectedImage && selectedImage.status === 'completed' && !selectedImage.isVideo && (
               <button 
                  onClick={() => setIsComparisonMode(!isComparisonMode)}
                  className={`flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded text-[10px] md:text-xs font-bold transition-all border ${isComparisonMode ? 'bg-lab-yellow text-black border-lab-yellow' : 'bg-transparent text-gray-400 border-gray-600 hover:text-white'}`}
               >
                  <Icons.Layers className="w-3 h-3 md:w-3 md:h-3" />
                  <span className="hidden md:inline">So Sánh (Y)</span>
                  <span className="md:hidden">So Sánh</span>
               </button>
             )}
             
            {selectedImage && selectedImage.status === 'completed' && (
              <button 
                onClick={() => handleDownload(selectedImage)}
                className="group flex items-center gap-2 px-2 md:px-4 py-1 md:py-1.5 bg-lab-panel hover:bg-lab-yellow hover:text-black border border-lab-border hover:border-lab-yellow rounded text-[10px] md:text-xs font-bold transition-all duration-300 shadow-md"
              >
                <Icons.Download className="w-3 h-3" />
                <span className="hidden md:inline">Xuất {selectedImage.isVideo ? 'Video' : '4K'}</span>
                <span className="md:hidden">Lưu</span>
              </button>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-6 overflow-hidden relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1a1a] to-black">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

          {!selectedImage ? (
            <div className="text-center text-lab-muted animate-in fade-in zoom-in duration-500 px-6">
              <div className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-4 rounded-full bg-lab-panel flex items-center justify-center border border-lab-border shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <Icons.Image className="w-8 h-8 md:w-10 md:h-10 opacity-30" />
              </div>
              <p className="text-xs md:text-sm font-light tracking-wide uppercase"><span className="md:hidden">Nhấn menu trái để tải ảnh</span><span className="hidden md:inline">Chọn hoặc tải ảnh lên để bắt đầu</span></p>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center animate-in fade-in duration-500">
              
              {isComparisonMode && selectedImage.status === 'completed' && selectedImage.processedUrl && !selectedImage.isVideo ? (
                 <ComparisonView 
                    originalUrl={selectedImage.originalUrl}
                    processedUrl={selectedImage.processedUrl}
                    onClose={() => setIsComparisonMode(false)}
                 />
              ) : (
                <div 
                  className="relative flex items-center justify-center max-w-full max-h-full transition-all duration-500 ease-out group"
                >
                  {/* DISPLAY LOGIC: Video vs Image */}
                  {selectedImage.isVideo && selectedImage.processedUrl ? (
                      <video 
                        src={selectedImage.processedUrl} 
                        controls 
                        autoPlay 
                        loop
                        className="max-w-full w-auto h-auto shadow-2xl max-h-[calc(100vh-160px)] md:max-h-[calc(100vh-180px)] rounded-lg border border-lab-border"
                      />
                  ) : (
                      <img 
                          src={selectedImage.processedUrl || selectedImage.originalUrl} 
                          alt="Workplace" 
                          className={`
                              max-w-full w-auto h-auto object-contain shadow-2xl
                              max-h-[calc(100vh-160px)] md:max-h-[calc(100vh-180px)]
                              ${selectedImage.status === 'processing' ? 'opacity-50 blur-sm scale-95' : 'scale-100'} 
                              transition-all duration-700
                          `} 
                      />
                  )}
                  
                  {/* Cost Data Hover */}
                  {selectedImage.status === 'completed' && selectedImage.costData && (
                      <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md border border-lab-border rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 hidden md:block">
                          <div className="text-[10px] font-mono space-y-1 min-w-[150px]">
                            <div className="border-b border-gray-700 pb-1 mb-1 text-lab-yellow font-bold flex justify-between">
                                <span>CHI PHÍ</span>
                                <span className={selectedImage.costData.variancePercent > 0 ? "text-red-400" : "text-green-400"}>{selectedImage.costData.variancePercent > 0 ? '+' : ''}{selectedImage.costData.variancePercent.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-white font-bold pt-1">
                                <span>{Math.round(selectedImage.costData.actualCost * PRICING_CONFIG.VND_RATE).toLocaleString('vi-VN')} đ</span>
                            </div>
                          </div>
                      </div>
                  )}

                  {selectedImage.status === 'processing' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-lab-yellow border-t-transparent rounded-full animate-spin mb-4 md:mb-6 shadow-[0_0_20px_rgba(255,215,0,0.2)]"></div>
                        <p className="text-lab-yellow font-bold tracking-[0.2em] text-xs md:text-sm animate-pulse text-center bg-black/50 px-3 py-1 rounded">
                           {selectedImage.isVideo ? 'RENDERING VIDEO (Chờ xíu)...' : 'RENDERING...'}
                        </p>
                        {processingQueue.length > 1 && (<div className="mt-3 px-3 py-1 bg-black/50 rounded-full border border-lab-border backdrop-blur-sm"><p className="text-[10px] text-gray-300">Queue: {processingQueue.indexOf(selectedImage.id) + 1} / {processingQueue.length}</p></div>)}
                      </div>
                  )}
                  {selectedImage.status === 'failed' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-6 text-center backdrop-blur-sm rounded-lg">
                      <Icons.Alert className="w-10 h-10 md:w-12 md:h-12 text-red-500 mb-4 animate-bounce" />
                      <p className="text-red-400 font-bold uppercase tracking-widest text-xs md:text-sm">Xử Lý Thất Bại</p>
                      <p className="text-[10px] md:text-xs text-gray-400 mt-2 max-w-[200px]">{selectedImage.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <BottomHistoryBar history={history} onSelectImage={setSelectedId} selectedId={selectedId} onDelete={handleDelete} />
      </main>

      {/* Right Sidebar Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[85%] sm:w-80 transform transition-transform duration-300 ease-out md:relative md:translate-x-0 md:w-auto shadow-2xl ${isRightOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <RightSidebar settings={settings} onUpdateSettings={setSettings} onGenerate={handleGenerateClick} isProcessing={isProcessing} canGenerate={!!selectedImage && selectedImage.status !== 'processing'} onClose={() => setIsRightOpen(false)} />
      </div>

      <CostModal isOpen={showCostModal} onClose={() => setShowCostModal(false)} onConfirm={handleConfirmGenerate} settings={settings} />
    </div>
  );
};

export default App;
