import React from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  Download, 
  Sparkles, 
  SlidersHorizontal, 
  RefreshCw, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Music, 
  Camera, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Loader2, 
  AlertCircle, 
  Fingerprint 
} from 'lucide-react';
import { GroundingSources } from '@web/features/slideshow/components/GroundingSources.js';
import { SlideshowDisplay } from '@web/features/slideshow/components/SlideshowDisplay.js';
import { GenerationLoader } from '@web/shared/components/GenerationLoader.js';
import { Skeleton } from '@web/shared/components/Skeleton.js';
import { InteractiveLogoOverlay } from '../../canvas/components/InteractiveLogoOverlay.js';
import { InteractiveTextCanvas } from '../../canvas/components/InteractiveTextCanvas.js';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { generateImage } from '@web/infrastructure/ai/geminiService.js';
import { cn, downloadFile } from '@web/lib/utils.js';
import { type TextWordLayer } from '../../canvas/hooks/useCanvasEditor.js';

function cleanTextContent(content: any): string {
  if (typeof content !== 'string') return '';
  return content
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/```(?:svg|xml|html)?\s*<svg[\s\S]*?<\/svg>\s*```/gi, '')
    .trim();
}

export interface CreativeOutputCanvasProps {
  result: any;
  setResult: React.Dispatch<React.SetStateAction<any>>;
  isGenerating: boolean;
  videoStatus: string;
  selectedGem: Gem;
  brandGuidelines: BrandGuidelines;
  prompt: string;
  selectedModel: string;
  bakeLogoOnGeneration: boolean;
  aspectRatio: string;
  assets: any[];
  // Canvas State & Handlers
  containerRef: React.RefObject<HTMLDivElement | null>;
  logoPosition: { x: number; y: number };
  setLogoPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  logoScale: number;
  setLogoScale: React.Dispatch<React.SetStateAction<number>>;
  logoInverted: boolean;
  setLogoInverted: React.Dispatch<React.SetStateAction<boolean>>;
  isDraggingLogo: boolean;
  handleLogoMouseDown: (e: React.MouseEvent) => void;
  handleLogoTouchStart: (e: React.TouchEvent) => void;
  textLayers: TextWordLayer[];
  setTextLayers: React.Dispatch<React.SetStateAction<TextWordLayer[]>>;
  selectedTextWordId: string | null;
  setSelectedTextWordId: React.Dispatch<React.SetStateAction<string | null>>;
  draggingTextWordId: string | null;
  newTextWordInput: string;
  setNewTextWordInput: React.Dispatch<React.SetStateAction<string>>;
  layoutStudioTab: 'logo' | 'text';
  setLayoutStudioTab: React.Dispatch<React.SetStateAction<'logo' | 'text'>>;
  handleTextMouseDown: (e: React.MouseEvent, id: string) => void;
  handleTextTouchStart: (e: React.TouchEvent, id: string) => void;
  handleAddTextWord: (split: boolean) => void;
  handleContainerMouseMove: (e: React.MouseEvent) => void;
  handleContainerTouchMove: (e: React.TouchEvent) => void;
  handleContainerTouchEnd: () => void;
  handleDownloadInteractiveImage: (bgSrc: string, logoSrc: string) => Promise<void>;
  // Audio & TTS
  isPlaying: boolean;
  isTTSLoading: boolean;
  audioProgress: number;
  setAudioProgress?: (progress: number) => void;
  audioDuration: number;
  audioVolume: number;
  setAudioVolume: (vol: number) => void;
  audioUrl: string | null;
  handleTTS: (text: string) => Promise<void>;
  handleDownloadAudio: () => void;
  // Slideshow
  currentSlide: number;
  setCurrentSlide: React.Dispatch<React.SetStateAction<number>>;
  slideshowTheme: 'light' | 'dark' | 'brand';
  setSlideshowTheme: React.Dispatch<React.SetStateAction<'light' | 'dark' | 'brand'>>;
  slideshowFont: 'sans' | 'serif';
  setSlideshowFont: React.Dispatch<React.SetStateAction<'sans' | 'serif'>>;
  slideshowOverlay: number;
  setSlideshowOverlay: React.Dispatch<React.SetStateAction<number>>;
  selectedPresentationTheme: any;
  handleDownloadPDF: () => Promise<void>;
  isDownloadingPDF: boolean;
  // Storyline
  isDownloadingZip: boolean;
  handleDownloadStorylineZip: () => Promise<void>;
  // Modals
  setHumanTouchItem: (item: any) => void;
  setHumanTouchComment: (val: string) => void;
  setHumanTouchSuccessMsg: (val: string | null) => void;
  setIsRefineModalOpen: (val: boolean) => void;
  setRefinePrompt: (val: string) => void;
  getBrandStyles: () => React.CSSProperties;
  handleGenerate: () => Promise<void>;
}

export const CreativeOutputCanvas: React.FC<CreativeOutputCanvasProps> = ({
  result,
  setResult,
  isGenerating,
  videoStatus,
  selectedGem,
  brandGuidelines,
  prompt,
  selectedModel,
  bakeLogoOnGeneration,
  aspectRatio,
  assets,
  containerRef,
  logoPosition,
  setLogoPosition,
  logoScale,
  setLogoScale,
  logoInverted,
  setLogoInverted,
  isDraggingLogo,
  handleLogoMouseDown,
  handleLogoTouchStart,
  textLayers,
  setTextLayers,
  selectedTextWordId,
  setSelectedTextWordId,
  draggingTextWordId,
  newTextWordInput,
  setNewTextWordInput,
  layoutStudioTab,
  setLayoutStudioTab,
  handleTextMouseDown,
  handleTextTouchStart,
  handleAddTextWord,
  handleContainerMouseMove,
  handleContainerTouchMove,
  handleContainerTouchEnd,
  handleDownloadInteractiveImage,
  isPlaying,
  isTTSLoading,
  audioProgress,
  setAudioProgress,
  audioDuration,
  audioVolume,
  setAudioVolume,

  audioUrl,
  handleTTS,
  handleDownloadAudio,
  currentSlide,
  setCurrentSlide,
  slideshowTheme,
  setSlideshowTheme,
  slideshowFont,
  setSlideshowFont,
  slideshowOverlay,
  setSlideshowOverlay,
  selectedPresentationTheme,
  handleDownloadPDF,
  isDownloadingPDF,
  isDownloadingZip,
  handleDownloadStorylineZip,
  setHumanTouchItem,
  setHumanTouchComment,
  setHumanTouchSuccessMsg,
  setIsRefineModalOpen,
  setRefinePrompt,
  getBrandStyles,
  handleGenerate
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (result) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative min-h-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
              OUTPUT DISPATCH: {result.type?.toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {(result.type === 'image' || result.type === 'video' || result.type === 'storyline' || result.type === 'campaign') && (
              <button 
                onClick={() => {
                  setHumanTouchItem({
                    title: `${selectedGem?.name || 'Asset'} Render`,
                    prompt: prompt || 'Image rendering asset',
                    imageUrl: result.data,
                    role: result.type.toUpperCase(),
                    modelsUsed: selectedModel || 'openai/gpt-image-2'
                  });
                  setHumanTouchComment('');
                  setHumanTouchSuccessMsg(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-355 hover:text-rose-600 dark:hover:text-rose-455 transition-colors cursor-pointer"
              >
                <Fingerprint size={14} />
                HUMAN TOUCH
              </button>
            )}
            
            <button 
              onClick={() => {
                if (result.type === 'image') {
                  if (!bakeLogoOnGeneration && (brandGuidelines.logo || textLayers.length > 0)) {
                    handleDownloadInteractiveImage(result.data, brandGuidelines.logo || '');
                  } else {
                    downloadFile(result.data, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-creative-${Date.now()}`);
                  }
                } else if (result.type === 'video' || result.type === 'audio') {
                  downloadFile(result.data, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-creative-${Date.now()}`);
                } else if (result.type === 'text' || result.type === 'campaign') {
                  const content = result.type === 'campaign' ? result.data.copy : result.data;
                  const blob = new Blob([content], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  downloadFile(url, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-narrative-${Date.now()}.md`);
                  URL.revokeObjectURL(url);
                } else if (result.type === 'slideshow') {
                  handleDownloadPDF();
                } else if (result.type === 'storyline') {
                  handleDownloadStorylineZip();
                }
              }}
              className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white hover:opacity-80 transition-all font-sans cursor-pointer"
            >
              <Download size={14} />
              EXPORT ASSET
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30">
          <div className="min-h-full flex flex-col items-center justify-center">
            {result.type === 'image' && (
              <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-5xl">
                {/* Interactive Image Canvas wrapper */}
                <div className="flex-1 flex flex-col items-center">
                  <div 
                    ref={containerRef}
                    onMouseMove={handleContainerMouseMove}
                    onMouseUp={handleContainerTouchEnd}
                    onMouseLeave={handleContainerTouchEnd}
                    onTouchMove={handleContainerTouchMove}
                    onTouchEnd={handleContainerTouchEnd}
                    className="relative select-none overflow-hidden rounded-sm shadow-xl border border-slate-250 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 inline-block max-w-full"
                  >
                    <img 
                      src={result.data} 
                      alt="Generated Creative" 
                      className="max-w-full max-h-125 pointer-events-none block rounded-sm"
                      referrerPolicy="no-referrer"
                    />

                    {/* Render the manual Logo Overlay if not baked */}
                    {!bakeLogoOnGeneration && brandGuidelines.logo && (
                      <InteractiveLogoOverlay 
                        logoUrl={brandGuidelines.logo}
                        logoPosition={logoPosition}
                        logoScale={logoScale}
                        logoInverted={logoInverted}
                        isDraggingLogo={isDraggingLogo}
                        onMouseDown={handleLogoMouseDown}
                        onTouchStart={handleLogoTouchStart}
                      />
                    )}

                    {/* Render manual customizable text layers if not baked */}
                    {!bakeLogoOnGeneration && (
                      <InteractiveTextCanvas 
                        textLayers={textLayers}
                        selectedTextWordId={selectedTextWordId}
                        draggingTextWordId={draggingTextWordId}
                        onTextMouseDown={handleTextMouseDown}
                        onTextTouchStart={handleTextTouchStart}
                      />
                    )}

                    {/* Default hover overlay ONLY if logo is baked */}
                    {bakeLogoOnGeneration && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-sm">
                         <button 
                           onClick={() => {
                             setRefinePrompt('');
                             setIsRefineModalOpen(true);
                           }}
                           className="bg-white text-slate-900 px-6 py-3 rounded-sm font-bold shadow-xl flex items-center gap-2 transform translate-y-4 hover:translate-y-0 transition-all cursor-pointer hover:bg-slate-50"
                         >
                           <Sparkles size={18} />
                           Refine with AI
                         </button>
                      </div>
                    )}

                  </div>
                  
                  {/* AI refinement action under the image layout */}
                  {!bakeLogoOnGeneration && (
                    <button 
                      onClick={() => {
                        setRefinePrompt('');
                        setIsRefineModalOpen(true);
                      }}
                      className="mt-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold px-4 py-2.5 rounded-sm shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Sparkles size={14} />
                      Refine Asset with AI
                    </button>
                  )}

                  <div className="mt-4 w-full">
                    <GroundingSources metadata={result.groundingMetadata} />
                  </div>
                </div>

                {/* Interactive layout controls sidebar panel */}
                {!bakeLogoOnGeneration && (
                  <div className="w-full lg:w-72 shrink-0 bg-slate-50/80 dark:bg-slate-900 p-5 rounded-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-5 shadow-sm text-left">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-sm">
                          <SlidersHorizontal size={12} />
                        </div>
                        <h4 className="text-[11px] font-extrabold text-slate-850 dark:text-slate-200 uppercase tracking-widest block font-sans">
                          Layout Studio
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Drag layers across the background stage, or use the fine-tuning slider controls below.
                      </p>
                    </div>

                    {/* Dual Studio Tabs */}
                    <div className="flex bg-slate-150 dark:bg-slate-800/80 p-0.5 rounded-sm gap-0.5">
                      <button
                        type="button"
                        onClick={() => setLayoutStudioTab('logo')}
                        disabled={!brandGuidelines.logo}
                        className={cn(
                          "flex-1 py-1 text-[9.5px] font-extrabold uppercase tracking-wider text-center rounded-sm transition-all cursor-pointer",
                          !brandGuidelines.logo ? "opacity-30 cursor-not-allowed" : "",
                          layoutStudioTab === 'logo' && brandGuidelines.logo
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-755 dark:hover:text-slate-350"
                        )}
                      >
                        Logo Layer
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayoutStudioTab('text')}
                        className={cn(
                          "flex-1 py-1 text-[9.5px] font-extrabold uppercase tracking-wider text-center rounded-sm transition-all cursor-pointer",
                          layoutStudioTab === 'text' || !brandGuidelines.logo
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-755 dark:hover:text-slate-350"
                        )}
                      >
                        Text Layers
                      </button>
                    </div>

                    {/* Logo Layer Tab Options */}
                    {layoutStudioTab === 'logo' && brandGuidelines.logo && (
                      <div className="space-y-4">
                        {/* Position Presets */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Corner Presets</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { label: 'Top Left', pos: { x: 15, y: 15 } },
                              { label: 'Top Right', pos: { x: 85, y: 15 } },
                              { label: 'Center', pos: { x: 50, y: 50 } },
                              { label: 'Bottom Left', pos: { x: 15, y: 85 } },
                              { label: 'Bottom Right', pos: { x: 85, y: 85 } },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setLogoPosition(preset.pos)}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors text-center cursor-pointer rounded-sm"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Scale slider */}
                        <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                            <span>Logo Scale</span>
                            <span className="font-mono text-slate-500 font-normal">{logoScale}%</span>
                          </div>
                          <input 
                            type="range"
                            min="5"
                            max="50"
                            value={logoScale}
                            onChange={(e) => setLogoScale(parseInt(e.target.value))}
                            className="w-full accent-rose-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* Logo Inversion Toggle */}
                        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Invert Colors</span>
                            <button
                              type="button"
                              onClick={() => setLogoInverted(prev => !prev)}
                              className={cn(
                                "px-3 py-1.5 rounded-sm text-[10px] font-extrabold transition-all border flex items-center gap-1.5 shadow-xs cursor-pointer select-none",
                                logoInverted
                                  ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-250 dark:border-rose-900/60"
                                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
                              )}
                            >
                              <RefreshCw size={11} className={cn("transition-transform duration-500", logoInverted ? "text-rose-500 rotate-180" : "text-slate-400")} />
                              {logoInverted ? "Inverted" : "Normal"}
                            </button>
                          </div>
                        </div>

                        {/* Fine Coordinates sliders */}
                        <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Fine Tuning</span>
                          
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                              <span>Offset X</span>
                              <span>{Math.round(logoPosition.x)}%</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={Math.round(logoPosition.x)}
                              onChange={(e) => setLogoPosition(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                              className="w-full accent-rose-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                              <span>Offset Y</span>
                              <span>{Math.round(logoPosition.y)}%</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="100"
                              value={Math.round(logoPosition.y)}
                              onChange={(e) => setLogoPosition(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                              className="w-full accent-rose-600 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Text Layer Engine Tab */}
                    {(layoutStudioTab === 'text' || !brandGuidelines.logo) && (
                      <div className="space-y-4">
                        {/* Create text section */}
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest block font-sans">
                            Create Text Layer
                          </span>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={newTextWordInput}
                              onChange={(e) => setNewTextWordInput(e.target.value)}
                              placeholder="e.g. Premium Organics"
                              className="flex-1 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-705 px-2.5 py-1.5 text-xs text-slate-850 dark:text-slate-100 rounded-sm focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddTextWord(true);
                                }
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                            <button
                              type="button"
                              onClick={() => handleAddTextWord(true)}
                              disabled={!newTextWordInput.trim()}
                              className="py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[9px] font-extrabold uppercase tracking-wider rounded-sm cursor-pointer disabled:opacity-40 transition-colors"
                              title="Creates separate draggable layer for each individual word, to allow per-word typographic style selection."
                            >
                              Add Per Word
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddTextWord(false)}
                              disabled={!newTextWordInput.trim()}
                              className="py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[9px] font-extrabold uppercase tracking-wider rounded-sm cursor-pointer disabled:opacity-40 transition-colors"
                              title="Positions the full text layer as one single block."
                            >
                              Add As Phrase
                            </button>
                          </div>
                        </div>

                        {/* Styles editor for selected text layer */}
                        {selectedTextWordId ? (() => {
                          const activeWord = textLayers.find(w => w.id === selectedTextWordId);
                          if (!activeWord) return null;
                          return (
                            <div className="bg-white/50 dark:bg-slate-800/40 p-3 rounded-sm border border-slate-200/60 dark:border-slate-800 space-y-3.5">
                              {/* Word Text Edit */}
                              <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">
                                    Text Content
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTextLayers(prev => prev.filter(w => w.id !== selectedTextWordId));
                                      setSelectedTextWordId(null);
                                    }}
                                    className="text-rose-500 hover:text-rose-600 font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Trash2 size={10} />
                                    Delete
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={activeWord.text}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, text: val } : w));
                                  }}
                                  className="w-full bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-700 px-2 py-1 text-xs text-slate-850 dark:text-slate-100 rounded-sm focus:outline-none"
                                />
                              </div>

                              {/* Per-word Font Dropdown */}
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest block font-sans">
                                  Font Selection
                                </span>
                                <select
                                  value={activeWord.fontFamily}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, fontFamily: val } : w));
                                  }}
                                  className="w-full bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-850 dark:text-slate-100 rounded-sm focus:outline-none cursor-pointer"
                                >
                                  {[
                                    { label: 'Outfit (Modern)', value: 'Outfit' },
                                    { label: 'Inter (Clean Global)', value: 'Inter' },
                                    { label: 'Space Grotesk (Tech Accent)', value: 'Space Grotesk' },
                                    { label: 'Playfair Display (Serif)', value: 'Playfair Display' },
                                    { label: 'Cormorant Garamond (Graceful)', value: 'Cormorant Garamond' },
                                    { label: 'JetBrains Mono (Technical)', value: 'JetBrains Mono' },
                                  ].map(f => (
                                    <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                      {f.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Font Size/Scale */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest font-sans">
                                  <span>Text Scale</span>
                                  <span className="font-mono text-slate-500 font-normal">{activeWord.scale}%</span>
                                </div>
                                <input 
                                  type="range"
                                  min="3"
                                  max="35"
                                  value={activeWord.scale}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, scale: val } : w));
                                  }}
                                  className="w-full accent-rose-600 h-1 bg-slate-205 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>

                              {/* Per-word customized color selectors */}
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-slate-450 dark:text-slate-405 uppercase tracking-widest block font-sans">
                                  Font Color Selection
                                </span>
                                
                                <div className="flex flex-wrap gap-1.5">
                                  {brandGuidelines.colors?.map((c, i) => (
                                    <button
                                      key={`word-brand-color-${i}`}
                                      type="button"
                                      onClick={() => setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, color: c } : w))}
                                      style={{ backgroundColor: c }}
                                      className={cn(
                                        "w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer relative",
                                        activeWord.color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-rose-500 ring-offset-1" : ""
                                      )}
                                      title={`Brand Palette Color ${i + 1}`}
                                    />
                                  ))}

                                  {['#ffffff', '#000000', '#f43f5e', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'].map((c) => (
                                    <button
                                      key={`word-std-color-${c}`}
                                      type="button"
                                      onClick={() => setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, color: c } : w))}
                                      style={{ backgroundColor: c }}
                                      className={cn(
                                        "w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer relative",
                                        activeWord.color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-rose-500 ring-offset-1" : ""
                                      )}
                                      title={c}
                                    />
                                  ))}

                                  <div className="relative w-5 h-5 overflow-hidden rounded-full border border-slate-250 dark:border-slate-700 shadow-xs cursor-pointer">
                                    <input
                                      type="color"
                                      value={activeWord.color.startsWith('#') && activeWord.color.length === 7 ? activeWord.color : '#ffffff'}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, color: val } : w));
                                      }}
                                      className="absolute inset-0 w-8 h-8 -translate-x-1.5 -translate-y-1.5 opacity-100 cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Coordinates Position Slider Controls */}
                              <div className="space-y-2 border-t border-slate-100 dark:border-slate-750 pt-2.5">
                                <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest block font-sans">Coordinates Offset</span>
                                
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                    <span>Offset X</span>
                                    <span>{Math.round(activeWord.position.x)}%</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(activeWord.position.x)}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, position: { ...w.position, x: val } } : w));
                                    }}
                                    className="w-full accent-rose-600 h-1 bg-slate-205 dark:bg-slate-750 rounded-lg appearance-none cursor-pointer"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                    <span>Offset Y</span>
                                    <span>{Math.round(activeWord.position.y)}%</span>
                                  </div>
                                  <input 
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(activeWord.position.y)}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, position: { ...w.position, y: val } } : w));
                                    }}
                                    className="w-full accent-rose-600 h-1 bg-slate-205 dark:bg-slate-750 rounded-lg appearance-none cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-sm text-[10px] text-slate-400 text-center border border-dashed border-slate-200 dark:border-slate-800">
                            No active text layer selected. Typographically select any word block directly inside the viewport stage to edit font attributes!
                          </div>
                        )}

                        {/* Registered summary list */}
                        {textLayers.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest font-sans">Active Layers ({textLayers.length})</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setTextLayers([]);
                                  setSelectedTextWordId(null);
                                }}
                                className="text-[9px] text-rose-500 font-bold hover:underline cursor-pointer"
                              >
                                Clear All
                              </button>
                            </div>

                            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                              {textLayers.map((layer) => (
                                <div
                                  key={layer.id}
                                  onClick={() => setSelectedTextWordId(layer.id)}
                                  className={cn(
                                    "p-1.5 px-2 bg-white dark:bg-slate-850 border rounded-sm flex items-center justify-between text-[11px] cursor-pointer transition-colors",
                                    selectedTextWordId === layer.id
                                      ? "border-rose-300 dark:border-rose-900 bg-rose-500/5"
                                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                                  )}
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                                    <span className="font-semibold truncate text-slate-850 dark:text-slate-200" style={{ fontFamily: layer.fontFamily }}>
                                      {layer.text}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[8px] text-slate-400 shrink-0 select-none">
                                    {layer.fontFamily} / {layer.scale}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {result.type === 'video' && (
              <div className="flex flex-col xl:flex-row gap-8 w-full max-w-6xl">
                <div className="flex-1 flex flex-col items-center">
                  <div className="relative inline-block w-full max-w-fit">
                    <video 
                      src={result.data} 
                      controls 
                      autoPlay 
                      loop 
                      className="w-full max-h-125 rounded-sm shadow-xl border border-slate-200 dark:border-slate-800 bg-black"
                    />

                  </div>
                </div>
                {result.concept && (
                  <div className="w-full xl:w-96 shrink-0 bg-white dark:bg-slate-900 p-6 rounded-sm shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-6 text-left">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                        <Volume2 size={16} className="text-slate-500" />
                        Voice Over
                      </h4>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-sm text-sm text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-700 relative group flex items-center justify-between gap-4">
                        <span>"{result.concept.voiceOver}"</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleTTS(result.concept.voiceOver)}
                            disabled={isTTSLoading}
                            className="p-2 bg-white dark:bg-slate-900 rounded-sm shadow-sm text-slate-900 dark:text-white hover:scale-105 transition-transform cursor-pointer disabled:opacity-50"
                            title={isTTSLoading ? "Generating Speech Audio..." : isPlaying ? "Pause Voice Over" : "Listen to Voice Over"}
                          >
                            {isTTSLoading ? <Loader2 size={14} className="animate-spin text-sky-500" /> : isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                          </button>
                          {audioUrl && (
                            <button 
                              onClick={handleDownloadAudio}
                              className="p-2 bg-white dark:bg-slate-900 rounded-sm shadow-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:scale-105 transition-transform cursor-pointer"
                              title="Download Audio"
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                        <Music size={16} className="text-slate-500" />
                        Music Style
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-sm border border-slate-100 dark:border-slate-700">
                        {result.concept.musicStyle}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                        <Camera size={16} className="text-slate-500" />
                        Cinematography & VFX
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-sm border border-slate-100 dark:border-slate-700">
                        {result.concept.cinematographyNotes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {result.type === 'audio' && (
              <div className="w-full max-w-3xl bg-white dark:bg-slate-900 p-8 rounded-sm shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-900 dark:text-white">
                  <Volume2 size={40} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Audio Track Generated</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Your custom audio track is ready to play.</p>
                </div>
                <audio controls src={result.data} className="w-full max-w-md" />
                <div className="w-full bg-slate-50 dark:bg-slate-800 p-6 rounded-sm border border-slate-100 dark:border-slate-700 text-left">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Script / Lyrics</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap italic">
                    "{result.script}"
                  </p>
                </div>
                <button 
                  onClick={() => {
                    downloadFile(result.data, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-audio-${Date.now()}.wav`);
                  }}
                  className="btn-primary flex items-center gap-2 cursor-pointer"
                >
                  <Download size={16} />
                  Download Audio
                </button>
              </div>
            )}

            {result.type === 'text' && (
              <div className="w-full max-w-3xl bg-white dark:bg-slate-900 p-6 md:p-10 rounded-sm shadow-sm border border-slate-200 dark:border-slate-800 relative text-left">
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white">
                        <Volume2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {selectedGem.id === 'strategy-captions' ? 'Social Captions' : selectedGem.name || 'Brand Copy'}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {selectedGem.id === 'strategy-captions' ? 'Platform Ready Copy & Hashtags' : 'AI Content & Voiceover Preview'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isTTSLoading && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-300 text-xs font-semibold animate-pulse shadow-sm">
                          <Loader2 size={14} className="animate-spin text-sky-500" />
                          <span>Generating Voiceover (TTS)...</span>
                        </div>
                      )}

                      {isPlaying && (
                        <div className="hidden sm:flex items-center gap-1 mr-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-sm animate-pulse">
                          <div className="w-1 h-3 bg-slate-400 dark:bg-slate-500 rounded-full animate-[bounce_1s_infinite_0ms]" />
                          <div className="w-1 h-4 bg-slate-400 dark:bg-slate-500 rounded-full animate-[bounce_1s_infinite_200ms]" />
                          <div className="w-1 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-[bounce_1s_infinite_400ms]" />
                          <span className="text-[10px] font-bold uppercase ml-1">Playing</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-sm border border-slate-100 dark:border-slate-700">
                        <button 
                          onClick={() => handleTTS(cleanTextContent(result.data))}
                          disabled={isTTSLoading}
                          className={cn(
                            "h-10 px-4 rounded-sm transition-all flex items-center gap-2 font-bold text-xs cursor-pointer select-none",
                            isTTSLoading
                              ? "bg-sky-600 text-white shadow-sm cursor-wait animate-pulse"
                              : isPlaying 
                              ? "bg-slate-800 text-white shadow-sm" 
                              : "bg-slate-900 text-white shadow-sm hover:bg-slate-800"
                          )}
                          title={isTTSLoading ? "Generating Speech Audio..." : isPlaying ? "Pause Narrative" : "Listen to Narrative"}
                        >
                          {isTTSLoading ? (
                            <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>Generating TTS...</span>
                            </>
                          ) : isPlaying ? (
                            <>
                              <Pause size={16} />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play size={16} />
                              <span>{audioDuration > 0 ? "Resume" : "Listen"}</span>
                            </>
                          )}
                        </button>

                        {audioUrl && (
                          <button 
                            onClick={handleDownloadAudio}
                            className="h-10 px-4 flex items-center gap-2 rounded-sm bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 shadow-sm transition-all font-bold text-xs cursor-pointer"
                            title="Download Audio"
                          >
                            <Download size={16} />
                            <span>Download Audio</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="markdown-body" style={getBrandStyles()}>
                    <ReactMarkdown>{cleanTextContent(result.data)}</ReactMarkdown>
                  </div>

                  {isTTSLoading && (
                    <div className="mt-6 p-4 bg-sky-50/70 dark:bg-sky-950/40 rounded-sm border border-sky-200 dark:border-sky-900/60 flex items-center justify-between gap-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900 flex items-center justify-center text-sky-600 dark:text-sky-300">
                          <Volume2 size={16} className="animate-bounce" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-sky-900 dark:text-sky-200">
                            Synthesizing Speech with AI Voice Model...
                          </p>
                          <p className="text-[11px] text-sky-700 dark:text-sky-400">
                            Processing realistic human intonation & cadence. Your voiceover will automatically play once ready.
                          </p>
                        </div>
                      </div>
                      <Loader2 size={18} className="animate-spin text-sky-500 shrink-0" />
                    </div>
                  )}

                  {audioDuration > 0 && (
                    <div className="mt-8 p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleTTS(cleanTextContent(result.data))}
                          disabled={isTTSLoading}
                          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 rounded-sm shadow-sm hover:shadow-md transition-all text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 cursor-pointer disabled:opacity-50"
                        >
                          {isTTSLoading ? <Loader2 size={18} className="animate-spin text-sky-500" /> : isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                        </button>
                        
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full relative group cursor-pointer overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 bg-slate-900 dark:bg-white transition-all"
                            style={{ width: `${(audioProgress / audioDuration) * 100}%` }}
                          />
                          <input 
                            type="range"
                            min={0}
                            max={audioDuration}
                            value={audioProgress}
                            onChange={(e) => {
                              const time = parseFloat(e.target.value);
                              if (setAudioProgress) setAudioProgress(time);
                            }}

                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                          />
                        </div>
                        
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatTime(audioProgress)} / {formatTime(audioDuration)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 px-1">
                        <button 
                          onClick={() => setAudioVolume(audioVolume === 0 ? 1 : 0)}
                          className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {audioVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                        <input 
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={audioVolume}
                          onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                          className="w-32 h-1 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-slate-900 dark:accent-white"
                        />
                      </div>
                    </div>
                  )}

                  <GroundingSources metadata={result.groundingMetadata} />
                </div>
              </div>
            )}

            {result.type === 'campaign' && (
              <div className="w-full max-w-6xl bg-white dark:bg-slate-900 p-6 md:p-10 rounded-sm shadow-sm border border-slate-100 dark:border-slate-800 relative grid grid-cols-1 lg:grid-cols-2 gap-10 text-left">
                <div className="space-y-8">
                  <div className="markdown-body" style={getBrandStyles()}>
                    <ReactMarkdown>{cleanTextContent(result.data.copy)}</ReactMarkdown>
                  </div>
                  <GroundingSources metadata={result.groundingMetadata} />
                </div>
                
                <div className="space-y-6 flex flex-col h-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white">
                        <ImageIcon size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Campaign Imagery</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">Key Visual Moments</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 gap-4">
                    {result.data.images.map((imgUrl: string, idx: number) => (
                      <div key={idx} className="relative group overflow-hidden rounded-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                        <img 
                          src={imgUrl} 
                          alt={`Campaign Image ${idx + 1}`} 
                          className="w-full h-auto object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-2 flex-wrap">
                          <button 
                            onClick={() => {
                              setHumanTouchItem({
                                title: `Campaign Image ${idx + 1}`,
                                prompt: `Campaign conceptual visuals: idx ${idx + 1} for ${prompt}`,
                                imageUrl: imgUrl,
                                role: `CAMPAIGN IMAGE`,
                                modelsUsed: 'openai/gpt-image-2'
                              });
                              setHumanTouchComment('');
                              setHumanTouchSuccessMsg(null);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-sm font-bold shadow-xl flex items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all text-xs border border-white/10 cursor-pointer"
                          >
                            <Fingerprint size={13} />
                            Human Touch
                          </button>

                          <button 
                            onClick={() => {
                              downloadFile(imgUrl, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-campaign-img-${idx + 1}-${Date.now()}.png`);
                            }}
                            className="bg-white hover:bg-slate-50 text-slate-900 px-3 py-2 rounded-sm font-bold shadow-xl flex items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all text-xs cursor-pointer"
                          >
                            <Download size={13} />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {result.type === 'storyline' && (
              <div className="w-full max-w-6xl space-y-12 text-left">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-4 text-center md:text-left">
                    <h2 className="text-4xl font-light tracking-tight text-slate-900 dark:text-slate-100">
                      {result.data.storyTitle}
                    </h2>
                    <div className="w-24 h-1 bg-slate-900 dark:bg-white rounded-full mx-auto md:mx-0" />
                  </div>
                  <button 
                    onClick={handleDownloadStorylineZip}
                    disabled={isDownloadingZip}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-sm font-bold tracking-widest uppercase text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-3 shadow-xl disabled:opacity-50 cursor-pointer"
                  >
                    {isDownloadingZip ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        PREPARING ZIP...
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Download All Scenes (ZIP)
                      </>
                    )}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {result.data.scenes.map((scene: any, index: number) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-6 group"
                    >
                      <div className={cn(
                        "relative overflow-hidden rounded-sm shadow-lg border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800",
                        aspectRatio === '1:1' ? 'aspect-square' : (aspectRatio === '9:16' ? 'aspect-9/16' : 'aspect-video')
                      )}>
                        {scene.image ? (
                          <>
                            <img 
                              src={scene.image} 
                              alt={scene.chapterTitle}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-2 flex-wrap">
                              <button 
                                onClick={() => {
                                  setHumanTouchItem({
                                    title: scene.chapterTitle || `Scene ${index + 1}`,
                                    prompt: scene.prompt || scene.narrative || 'Scene narrative artwork',
                                    imageUrl: scene.image,
                                    role: `SCENE ${index + 1}`,
                                    modelsUsed: 'openai/gpt-image-2'
                                  });
                                  setHumanTouchComment('');
                                  setHumanTouchSuccessMsg(null);
                                }}
                                className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-sm font-bold shadow-xl flex items-center gap-1.5 transform translate-y-4 group-hover:translate-y-0 transition-all text-xs border border-white/10 cursor-pointer"
                              >
                                <Fingerprint size={14} />
                                Human Touch
                              </button>

                              <button 
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = scene.image;
                                  link.download = `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-storyline-scene-${index + 1}-${Date.now()}`;
                                  link.click();
                                }}
                                className="bg-white text-slate-900 hover:bg-slate-50 px-4 py-2 rounded-sm font-bold shadow-xl flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all text-xs cursor-pointer"
                              >
                                <Download size={14} />
                                Download
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0">
                            <Skeleton className="w-full h-full" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                              <div className="relative">
                                <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" size={32} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-ping" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                                  Generating Scene {index + 1}
                                </p>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 italic max-w-37.5 mx-auto line-clamp-2">
                                  {scene.narrative}
                                </p>
                              </div>
                            </div>

                            
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                              <div className="w-full h-0.5 bg-slate-900/10 dark:bg-white/10 absolute top-0 left-0 animate-scan" />
                            </div>
                          </div>
                        )}
                        <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest">
                          Scene {index + 1}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{scene.chapterTitle}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed italic">
                          "{scene.narrative}"
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {result.type === 'slideshow' && (
              <SlideshowDisplay 
                result={result}
                setResult={setResult}
                currentSlide={currentSlide}
                setCurrentSlide={setCurrentSlide}
                slideshowTheme={slideshowTheme}
                setSlideshowTheme={setSlideshowTheme}
                slideshowFont={slideshowFont}
                setSlideshowFont={setSlideshowFont}
                slideshowOverlay={slideshowOverlay}
                setSlideshowOverlay={setSlideshowOverlay}
                handleDownloadPDF={handleDownloadPDF}
                isDownloadingPDF={isDownloadingPDF}
                brandGuidelines={brandGuidelines}
                generateImage={generateImage}
                assets={assets}
                cn={cn}
                aspectRatio={aspectRatio}
                selectedPresentationTheme={selectedPresentationTheme}
              />
            )}

            {result.type === 'error' && (
              <div className="flex flex-col items-center gap-4 text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-sm flex items-center justify-center">
                  <AlertCircle size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Generation Failed</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{result.message}</p>
                </div>
                <button onClick={handleGenerate} className="btn-primary cursor-pointer">Try Again</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12">
      {isGenerating ? (
        <GenerationLoader 
          title={videoStatus ? 'Processing Video Render...' : 'Synthesizing Output...'}
          subtitle={videoStatus || `Executing request against ${brandGuidelines.name} parameters. This may take a few moments as we optimize for your brand identity.`}
          icon={videoStatus ? VideoIcon : Sparkles}
        />
      ) : (
        <div className="flex flex-col items-center gap-6 opacity-30">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-sm flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Sparkles size={32} />
          </div>
          <div className="space-y-1 text-center">
            <h3 className="text-xl font-light text-slate-900 dark:text-slate-100 tracking-tight">System Ready</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-light">Awaiting input parameters</p>
          </div>
        </div>
      )}
    </div>
  );
};
