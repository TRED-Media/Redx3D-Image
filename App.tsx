
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import BottomHistoryBar from './components/BottomHistoryBar';
import CostModal from './components/CostModal';
import ComparisonView from './components/ComparisonView';
import { ProcessedImage, ImageSettings, DEFAULT_SETTINGS, ProjectStats } from './types';
import { generateProductImage, generateProductVideo } from './services/geminiService';
import { storageService } from './services/storageService';
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
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  
  // DARK MODE STATE
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check local storage or system preference
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Apply Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  
  // LIFETIME STATS (Persistent)
  const [lifetimeStats, setLifetimeStats] = useState<ProjectStats>({
    totalImagesGenerated: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0
  });

  const [showCostModal, setShowCostModal] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  
  // NEW: State for Mobile History Toggle
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);

  // --- ZOOM & PAN STATE ---
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const selectedImage = history.find(img => img.id === selectedId);
  const isProcessing = processingQueue.length > 0;

  // Reset zoom when image changes
  useEffect(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, [selectedId]);

  // --- ZOOM HANDLERS ---
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => {
    setZoomLevel(prev => {
        const next = Math.max(prev - 0.5, 1);
        if (next === 1) setPanPosition({ x: 0, y: 0 });
        return next;
    });
  };
  const handleResetZoom = () => {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
  };

  // --- DRAG HANDLERS ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragStartRef.current = { x: clientX - panPosition.x, y: clientY - panPosition.y };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    if ('touches' in e) e.preventDefault(); // Prevent scroll on mobile
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setPanPosition({
        x: clientX - dragStartRef.current.x,
        y: clientY - dragStartRef.current.y
    });
  };

  const handleDragEnd = () => setIsDragging(false);

  // -- Load History & Stats from DB --
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedImages = await storageService.getAllImages();
        
        // Clean up stuck processing items
        const cleanImages = savedImages.map(img => {
          if (img.status === 'processing') {
            return { ...img, status: 'failed' as const, error: 'Interrupted by reload' };
          }
          return img;
        });

        // Calculate stats JUST from current history (for sync check)
        let historyStats: ProjectStats = {
          totalImagesGenerated: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0
        };

        cleanImages.forEach(img => {
           if (img.status === 'completed' && img.costData) {
             historyStats.totalImagesGenerated++;
             historyStats.totalInputTokens += img.costData.actualInputTokens;
             historyStats.totalOutputTokens += img.costData.actualOutputTokens;
             historyStats.totalCost += img.costData.actualCost;
           }
        });

        // Sync Lifetime Stats: Ensure they are at least as high as current history
        const syncedStats = storageService.syncStatsWithHistory(historyStats);

        setHistory(cleanImages);
        setLifetimeStats(syncedStats);
        
        if (cleanImages.length > 0) {
            setSelectedId(cleanImages[0].id);
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setIsStorageLoaded(true);
      }
    };
    loadData();
  }, []);

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
        const newImg: ProcessedImage = {
          id: uuidv4(),
          originalUrl: base64,
          timestamp: Date.now(),
          status: 'idle'
        };
        newImages.push(newImg);
        // Save to DB
        storageService.saveImage(newImg);
      } catch (err) {
        console.error("Failed to read file", file.name, err);
      }
    }
    setHistory(prev => [...newImages, ...prev]);
    if (newImages.length > 0 && !selectedId) {
      setSelectedId(newImages[0].id);
    }
    setIsLeftOpen(false); // Close sidebar on mobile after upload interaction
    setIsMobileHistoryOpen(true); // Auto-open history on mobile when uploading
  };

  const handleDelete = async (id: string) => {
    setHistory(prev => prev.filter(img => img.id !== id));
    if (selectedId === id) setSelectedId(null);
    // Remove from DB, but DO NOT decrement lifetime stats
    await storageService.deleteImage(id);
  };

  const handleResetStats = async () => {
    if (window.confirm("Bạn có chắc muốn RESET toàn bộ thống kê chi phí về 0 không?")) {
        const reset = storageService.resetLifetimeStats();
        setLifetimeStats(reset);
    }
  };

  const handleClearAll = async () => {
    setHistory([]);
    setSelectedId(null);
    // Clear DB Images, but keep Lifetime Stats (money is still spent)
    await storageService.clearAll();
  };

  const handleGenerateClick = () => {
    if (!selectedImage) return;
    setIsRightOpen(false); // Close sidebar on mobile
    setShowCostModal(true);
  };

  const handleConfirmGenerate = async () => {
    // 1. Mandatory API Key Check for Premium Models
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
    
    const countPerAngle = settings.model === 'veo-3.1-fast-generate-preview' ? 1 : (settings.outputCount || 1);
    const numberOfAngles = settings.model === 'veo-3.1-fast-generate-preview' ? 1 : (settings.viewAngle?.length || 1);
    const numberOfLenses = settings.model === 'veo-3.1-fast-generate-preview' ? 1 : (settings.focalLength?.length || 1);
    const numberOfDevices = settings.model === 'veo-3.1-fast-generate-preview' ? 1 : (settings.photographyDevice?.length || 1);
    
    const totalExpected = countPerAngle * numberOfAngles * numberOfLenses * numberOfDevices;

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

    // Update State & DB for processing items
    setHistory(prev => [...newEntries, ...prev]);
    newEntries.forEach(img => storageService.saveImage(img));
    
    if (newProcessingIds.length > 0) setSelectedId(newProcessingIds[0]);
    setProcessingQueue(prev => [...prev, ...newProcessingIds]);
    setIsMobileHistoryOpen(true); // Auto-open history on mobile to show progress

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
      let batchCount = 0;

      for (let i = 0; i < newProcessingIds.length; i++) {
        const pid = newProcessingIds[i];
        if (i < generatedResults.length) {
            const result = generatedResults[i];
            let finalUrl = result.imageUrl;
            
            // Apply watermark
            if (!result.isVideo && settings.watermark?.enabled && settings.watermark.url) {
                finalUrl = await applyWatermark(finalUrl, settings.watermark);
            }

            const actualInputCost = (result.usage.inputTokens / 1_000_000) * pricing.INPUT;
            const actualOutputCost = (result.usage.outputTokens / 1_000_000) * pricing.OUTPUT;
            const totalActualCost = actualInputCost + actualOutputCost;

            batchInputTokens += result.usage.inputTokens;
            batchOutputTokens += result.usage.outputTokens;
            batchCost += totalActualCost;
            batchCount++;

            const variance = ((totalActualCost - estCost) / estCost) * 100;
            
            const completedImageUpdate = { 
                status: 'completed' as const, 
                processedUrl: finalUrl,
                isVideo: result.isVideo,
                seed: result.seed,
                costData: {
                    estimatedInputTokens: estInput,
                    estimatedOutputTokens: estOutput,
                    estimatedCost: estCost,
                    actualInputTokens: result.usage.inputTokens,
                    actualOutputTokens: result.usage.outputTokens,
                    actualCost: totalActualCost,
                    variancePercent: variance
                }
            };

            updates.set(pid, completedImageUpdate);
            
            // Save Completed Image to DB
            const fullImg: ProcessedImage = {
                ...newEntries[i],
                ...completedImageUpdate
            };
            storageService.saveImage(fullImg);

        } else {
             const failedUpdate = { status: 'failed' as const, error: "API did not return enough results" };
             updates.set(pid, failedUpdate);
             storageService.saveImage({ ...newEntries[i], ...failedUpdate });
        }
      }

      setHistory(prev => prev.map(img => updates.has(img.id) ? { ...img, ...updates.get(img.id) } : img));

      // UPDATE LIFETIME STATS (Persistent) - Now with modelID
      const incrementStats = {
        totalImagesGenerated: batchCount,
        totalInputTokens: batchInputTokens,
        totalOutputTokens: batchOutputTokens,
        totalCost: batchCost
      };
      
      const newTotalStats = storageService.updateLifetimeStats(incrementStats, settings.model);
      setLifetimeStats(newTotalStats);

    } catch (error: any) {
      console.error("Generation Error:", error);
      
      const getErrorMsg = (err: any) => {
        if (typeof err === 'string') return err;
        if (err?.message) return err.message;
        if (err?.error?.message) return err.error.message;
        return JSON.stringify(err);
      };
      
      const errorMsg = getErrorMsg(error);
      const errorStr = JSON.stringify(error);

      // Robust check for Permissions/Auth errors (403) or Not Found (404)
      const isAuthError = 
         errorMsg.includes("403") || 
         errorMsg.includes("PERMISSION_DENIED") ||
         errorMsg.includes("permission") ||
         errorStr.includes("PERMISSION_DENIED") ||
         error?.status === 403;

      const isNotFoundError = 
         errorMsg.includes("not found") || 
         errorMsg.includes("404") ||
         error?.status === 404;

      if (aistudio && (isAuthError || isNotFoundError)) {
        try {
            console.log("Triggering API Key selection due to error:", errorMsg);
            await aistudio.openSelectKey();
        } catch (e) { /* ignore */ }
      }
      
      // Update DB for failed items
      setHistory(prev => {
         const newState = prev.map(img => {
            if (newProcessingIds.includes(img.id)) {
               const failedImg = { ...img, status: 'failed' as const, error: errorMsg };
               storageService.saveImage(failedImg); 
               return failedImg;
            }
            return img;
         });
         return newState;
      });
      
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
    // FIX: Use 100dvh (dynamic viewport height) instead of h-screen to handle mobile browser address bars
    <div className="flex flex-col lg:flex-row h-[100dvh] w-screen bg-lab-black text-lab-text font-sans overflow-hidden transition-colors duration-300">
      
      {/* Mobile/Tablet Header - No Orange Logo */}
      <div className="lg:hidden h-14 landscape:h-12 bg-lab-dark border-b-2 border-lab-border flex items-center justify-between px-3 z-40 shrink-0 shadow-sm transition-colors duration-300">
         <button onClick={() => setIsLeftOpen(true)} className="p-2 -ml-2 text-lab-text hover:text-lab-yellow active:scale-95 transition-transform"><Icons.Layers className="w-6 h-6" /></button>
         <div className="flex items-center gap-1.5">
            <span className="text-lab-text text-lg font-black tracking-widest uppercase vintage-font">REDx 3D</span>
         </div>
         <button onClick={() => setIsRightOpen(true)} className="p-2 -mr-2 text-lab-text hover:text-lab-yellow relative active:scale-95 transition-transform">
            <Icons.Settings className="w-6 h-6" />
            {selectedImage && selectedImage.status !== 'processing' && (
               <span className="absolute top-2 right-2 w-2 h-2 bg-lab-yellow rounded-full animate-pulse border border-lab-dark"></span>
            )}
         </button>
      </div>

      {/* Mobile Backdrop */}
      {(isLeftOpen || isRightOpen) && (
        <div 
          className="fixed inset-0 bg-lab-text/50 z-40 lg:hidden backdrop-blur-sm transition-opacity animate-in fade-in" 
          onClick={() => { setIsLeftOpen(false); setIsRightOpen(false); }} 
        />
      )}

      {/* Left Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[85%] sm:w-80 md:w-80 lg:w-80 transform transition-transform duration-300 ease-out lg:relative lg:translate-x-0 shadow-2xl ${isLeftOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <LeftSidebar 
          history={history} 
          onUpload={handleUpload} 
          onSelectImage={setSelectedId} 
          selectedId={selectedId} 
          onDelete={handleDelete} 
          onClose={() => setIsLeftOpen(false)} 
          projectStats={lifetimeStats} 
          settings={settings} 
          onUpdateSettings={setSettings}
          onResetStats={handleResetStats}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      </div>

      <main className="flex-1 bg-lab-black relative flex flex-col min-w-0 h-full transition-colors duration-300">
        {/* Top Toolbar (Desktop) - Updated to Vintage Style */}
        <div className="h-10 md:h-14 shrink-0 border-b-2 border-lab-border flex items-center justify-between px-4 md:px-6 bg-lab-dark/95 backdrop-blur-md z-10 relative text-lab-text shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-4 w-1/3">
             {selectedImage && (
               <span className="text-[10px] md:text-xs text-lab-muted font-black font-mono uppercase tracking-widest animate-in fade-in slide-in-from-left-2 truncate bg-lab-panel px-2 py-1 rounded border border-lab-border/30">
                 ID: <span className="text-lab-yellowHover">{selectedImage.id.substring(0, 8)}</span>
               </span>
             )}
          </div>
          
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none w-full justify-center">
             <h1 className="hidden md:flex items-center gap-2 text-sm lg:text-lg font-black tracking-tight text-lab-text uppercase vintage-font">
                Xử lí ảnh cùng <span className="text-lab-yellow underline decoration-4 decoration-wavy underline-offset-4">REDx 3D Lab</span>
             </h1>
          </div>

          <div className="flex items-center justify-end gap-2 w-1/3">
             {selectedImage && selectedImage.status === 'completed' && !selectedImage.isVideo && (
               <button 
                  onClick={() => setIsComparisonMode(!isComparisonMode)}
                  className={`flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-black transition-all border-2 shadow-sm active:translate-y-0.5 ${isComparisonMode ? 'bg-lab-text text-white border-lab-text' : 'bg-lab-panel text-lab-text border-lab-border hover:bg-white'}`}
               >
                  <Icons.Layers className="w-3 h-3 md:w-3 md:h-3" />
                  <span className="hidden md:inline">So Sánh (Y)</span>
                  <span className="md:hidden">So Sánh</span>
               </button>
             )}
             
            {selectedImage && selectedImage.status === 'completed' && (
              <button 
                onClick={() => handleDownload(selectedImage)}
                className="group flex items-center gap-2 px-2 md:px-4 py-1 md:py-1.5 bg-lab-yellow hover:bg-lab-yellowHover text-white border-2 border-lab-text/20 hover:border-lab-text rounded-lg text-[10px] md:text-xs font-black transition-all duration-300 shadow-md active:translate-y-0.5"
              >
                <Icons.Download className="w-3 h-3" />
                <span className="hidden md:inline">Xuất {selectedImage.isVideo ? 'Video' : '4K'}</span>
                <span className="md:hidden">Lưu</span>
              </button>
            )}
          </div>
        </div>

        {/* Canvas Area - Important Layout Fix: flex-1 and min-h-0 to allow shrinking */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 md:p-6 lg:p-10 overflow-hidden relative bg-lab-black transition-colors duration-300">
          {/* Paper Texture Overlay (Inverted in Dark Mode via mix-blend-mode if needed, but overlay handles it well) */}
          <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

          {!selectedImage ? (
            // --- HERO BANNER ---
            // Removed rotation. Optimized max-width and padding for landscape mode.
            <div data-theme="light" className="text-center animate-in fade-in zoom-in duration-500 w-full max-w-3xl px-4 z-10 flex items-center justify-center">
              <div 
                className="bg-lab-panel border-4 border-lab-border w-full p-6 md:p-10 lg:p-14 landscape:p-4 rounded-3xl shadow-[8px_8px_0px_0px_rgba(38,70,83,0.3)] flex flex-col items-center gap-4 md:gap-8 landscape:gap-2 transition-colors duration-300"
              >
                  {/* Badge Icon */}
                  <div className="relative group">
                     <div className="relative w-20 h-20 md:w-32 md:h-32 landscape:w-16 landscape:h-16 rounded-full bg-lab-yellow flex items-center justify-center border-4 border-lab-text shadow-xl group-hover:scale-105 transition-transform duration-500">
                        <Icons.Image className="w-10 h-10 md:w-16 md:h-16 landscape:w-8 landscape:h-8 text-white" />
                     </div>
                     <div className="absolute -bottom-2 bg-lab-text text-white text-[9px] md:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-white/20 landscape:text-[8px] landscape:px-2 landscape:py-0.5">Est. 2025</div>
                  </div>
                  
                  <div className="space-y-2 landscape:space-y-0.5">
                     <h2 className="text-sm md:text-xl font-black uppercase tracking-[0.2em] text-lab-muted vintage-font landscape:text-xs">
                        Professional Studio
                     </h2>
                     {/* Vintage Typography */}
                     <div className="flex flex-col items-center leading-none">
                         <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-lab-text drop-shadow-sm vintage-font tracking-tighter landscape:text-5xl landscape:md:text-6xl">
                            REDx
                         </h1>
                         <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-lab-yellow drop-shadow-[2px_2px_0px_#264653] vintage-font tracking-tight landscape:text-4xl landscape:md:text-5xl">
                            3D LAB
                         </h1>
                     </div>
                     <p className="text-xs md:text-base text-lab-text font-bold tracking-wide max-w-md mx-auto leading-relaxed pt-4 border-t-2 border-lab-text/10 mt-4 landscape:mt-2 landscape:pt-1 landscape:text-[10px] landscape:leading-tight">
                        Nhiếp ảnh AI đậm chất nghệ thuật. <br className="hidden md:block"/>
                        Chọn ảnh từ ngăn kéo bên trái để bắt đầu.
                     </p>
                  </div>
                  
                  {/* Retro Feature Pills */}
                  <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 landscape:gap-1.5 pt-2 landscape:pt-0">
                      <span className="px-3 py-1.5 landscape:px-2 landscape:py-1 bg-white/50 rounded-full border-2 border-lab-text/10 text-[9px] md:text-xs font-black uppercase tracking-widest text-lab-text flex items-center gap-1.5 shadow-sm">
                        <Icons.Check className="w-3 h-3 text-lab-yellow" /> 4K Film Grain
                      </span>
                      <span className="px-3 py-1.5 landscape:px-2 landscape:py-1 bg-white/50 rounded-full border-2 border-lab-text/10 text-[9px] md:text-xs font-black uppercase tracking-widest text-lab-text flex items-center gap-1.5 shadow-sm">
                        <Icons.Check className="w-3 h-3 text-lab-yellow" /> Soft Lighting
                      </span>
                      <span className="px-3 py-1.5 landscape:px-2 landscape:py-1 bg-white/50 rounded-full border-2 border-lab-text/10 text-[9px] md:text-xs font-black uppercase tracking-widest text-lab-text flex items-center gap-1.5 shadow-sm">
                        <Icons.Check className="w-3 h-3 text-lab-yellow" /> Gemini Power
                      </span>
                  </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center animate-in fade-in duration-500 overflow-hidden">
              
              {isComparisonMode && selectedImage.status === 'completed' && selectedImage.processedUrl && !selectedImage.isVideo ? (
                 <ComparisonView 
                    originalUrl={selectedImage.originalUrl}
                    processedUrl={selectedImage.processedUrl}
                    onClose={() => setIsComparisonMode(false)}
                 />
              ) : (
                <div 
                  className={`
                    relative flex items-center justify-center max-w-full max-h-full transition-all ease-out group p-4
                    ${isDragging ? 'cursor-grabbing' : zoomLevel > 1 ? 'cursor-grab' : 'cursor-default'}
                  `}
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  onTouchStart={handleDragStart}
                  onTouchMove={handleDragMove}
                  onTouchEnd={handleDragEnd}
                >
                  {/* Photo Frame Effect (Only visible when not zoomed in significantly) */}
                  <div 
                    className="absolute inset-2 bg-white/10 rounded-2xl border-4 border-lab-dark/20 transform rotate-1 pointer-events-none transition-opacity"
                    style={{ opacity: zoomLevel > 1.2 ? 0 : 1 }}
                  ></div>

                  {/* DISPLAY LOGIC with Zoom & Pan */}
                  <div 
                     style={{ 
                        transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                     }}
                     className="relative z-10 max-w-full max-h-full flex items-center justify-center"
                  >
                      {selectedImage.isVideo && selectedImage.processedUrl ? (
                          <video 
                            src={selectedImage.processedUrl} 
                            controls 
                            autoPlay 
                            loop
                            className="max-w-full w-auto h-auto shadow-[10px_10px_30px_rgba(0,0,0,0.3)] max-h-[80vh] rounded-lg border-4 border-white"
                          />
                      ) : (
                          <img 
                              src={selectedImage.processedUrl || selectedImage.originalUrl} 
                              alt="Workplace" 
                              draggable={false}
                              className={`
                                  max-w-full w-auto h-auto object-contain shadow-[10px_10px_30px_rgba(0,0,0,0.3)]
                                  max-h-[80vh]
                                  rounded-lg border-4 border-white bg-white
                                  ${selectedImage.status === 'processing' ? 'opacity-80 sepia blur-[2px]' : ''} 
                              `} 
                          />
                      )}
                  </div>
                  
                  {/* ZOOM CONTROLS (Floating) - Adjusted Position for Mobile */}
                  {!selectedImage.isVideo && selectedImage.status !== 'processing' && (
                     <div 
                       data-theme="light"
                       className="absolute bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-lab-dark/95 p-2 rounded-full border border-lab-border/30 shadow-[0_8px_20px_rgba(0,0,0,0.3)] z-30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 safe-area-bottom"
                     >
                        <button onClick={handleZoomOut} className="p-2 hover:bg-lab-text/10 rounded-full text-lab-text transition-colors active:scale-90" disabled={zoomLevel <= 1}>
                           <span className="sr-only">Zoom Out</span>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        
                        <div className="min-w-[40px] text-center font-mono flex flex-col items-center justify-center leading-none">
                            <span className="text-[12px] font-black text-lab-text">{Math.round(zoomLevel * 100)}%</span>
                        </div>

                        <button onClick={handleZoomIn} className="p-2 hover:bg-lab-text/10 rounded-full text-lab-text transition-colors active:scale-90" disabled={zoomLevel >= 5}>
                           <span className="sr-only">Zoom In</span>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        
                        {zoomLevel > 1 && (
                            <div className="w-px h-4 bg-lab-text/20 mx-1"></div>
                        )}
                        
                        {zoomLevel > 1 && (
                            <button onClick={handleResetZoom} className="px-3 py-1.5 bg-lab-yellow text-white text-[10px] font-bold rounded-full uppercase hover:bg-lab-yellowHover shadow-sm active:translate-y-0.5 transition-all">
                                RESET
                            </button>
                        )}
                     </div>
                  )}

                  {/* Cost Data Badge (Retro Style) */}
                  {selectedImage.status === 'completed' && selectedImage.costData && zoomLevel === 1 && (
                      <div className="absolute top-4 left-4 bg-lab-dark border-2 border-lab-text rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 hidden md:block shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                          <div className="text-[10px] font-mono space-y-1 min-w-[150px] text-lab-text">
                            <div className="border-b border-lab-text/20 pb-1 mb-1 font-bold flex justify-between">
                                <span>BILLING</span>
                                <span className={selectedImage.costData.variancePercent > 0 ? "text-red-600" : "text-green-600"}>{selectedImage.costData.variancePercent > 0 ? '+' : ''}{selectedImage.costData.variancePercent.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between font-black pt-1 text-xs">
                                <span>{Math.round(selectedImage.costData.actualCost * PRICING_CONFIG.VND_RATE).toLocaleString('vi-VN')} đ</span>
                            </div>
                          </div>
                      </div>
                  )}

                  {selectedImage.status === 'processing' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-4 pointer-events-none">
                        <div className="w-16 h-16 border-4 border-lab-dark border-dashed rounded-full animate-spin-slow mb-4 bg-lab-yellow shadow-lg flex items-center justify-center">
                            <Icons.Magic className="w-6 h-6 text-white animate-pulse" />
                        </div>
                        <div className="bg-lab-dark px-4 py-2 rounded-lg border-2 border-lab-text shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
                           <p className="text-lab-text font-black tracking-[0.1em] text-xs md:text-sm text-center uppercase">
                              {selectedImage.isVideo ? 'Developing Film...' : 'Printing Photo...'}
                           </p>
                        </div>
                        {processingQueue.length > 1 && (<div className="mt-3 px-3 py-1 bg-white/80 rounded-full border border-lab-text"><p className="text-[10px] text-lab-text font-bold">Queue: {processingQueue.indexOf(selectedImage.id) + 1} / {processingQueue.length}</p></div>)}
                      </div>
                  )}
                  {selectedImage.status === 'failed' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-lab-yellow/90 z-20 p-6 text-center backdrop-blur-sm rounded-lg border-4 border-white pointer-events-none">
                      <Icons.Alert className="w-12 h-12 text-white mb-2" />
                      <p className="text-white font-black uppercase tracking-widest text-sm">Error Developing</p>
                      <p className="text-[10px] md:text-xs text-white mt-1 max-w-[200px] font-mono bg-black/10 p-2 rounded">{selectedImage.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* MOBILE HISTORY TOGGLE BUTTON */}
          <button 
            onClick={() => setIsMobileHistoryOpen(!isMobileHistoryOpen)}
            className={`
              md:hidden absolute bottom-6 left-6 z-40 w-12 h-12 rounded-full shadow-[4px_4px_0px_#264653] border-2 border-lab-text flex items-center justify-center transition-all duration-300 active:scale-90 active:translate-y-1 active:shadow-none
              ${isMobileHistoryOpen ? 'bg-lab-text text-white rotate-180' : 'bg-lab-yellow text-white'}
            `}
          >
            {isMobileHistoryOpen ? <Icons.Close className="w-6 h-6" /> : <Icons.History className="w-6 h-6" />}
          </button>

        </div>

        {/* 
          HISTORY BAR CONTAINER 
          - Mobile: Fixed at bottom, toggles up/down
          - Desktop: Relative, always visible 
        */}
        <div className={`
          fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-in-out md:relative md:transform-none
          ${isMobileHistoryOpen ? 'translate-y-0 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]' : 'translate-y-[110%] md:translate-y-0'}
        `}>
            <BottomHistoryBar 
              history={history} 
              onSelectImage={setSelectedId} 
              selectedId={selectedId} 
              onDelete={handleDelete} 
              onClearAll={handleClearAll}
              onClose={() => setIsMobileHistoryOpen(false)}
            />
        </div>

      </main>

      {/* Right Sidebar Drawer - Drawer on Tablet/Mobile, Static on Desktop (LG+) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[85%] sm:w-80 md:w-80 lg:w-80 transform transition-transform duration-300 ease-out lg:relative lg:translate-x-0 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] ${isRightOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <RightSidebar settings={settings} onUpdateSettings={setSettings} onGenerate={handleGenerateClick} isProcessing={isProcessing} canGenerate={!!selectedImage && selectedImage.status !== 'processing'} onClose={() => setIsRightOpen(false)} />
      </div>

      <CostModal isOpen={showCostModal} onClose={() => setShowCostModal(false)} onConfirm={handleConfirmGenerate} settings={settings} />
    </div>
  );
};

export default App;
