import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight as ChevronRightIcon, 
  FileDown, 
  Plus, 
  Trash2, 
  Loader2, 
  Sparkles, 
  Layout, 
  Columns, 
  Grid, 
  Move, 
  TrendingUp, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { BrandLogo } from '@web/features/brand/components/BrandLogo.js';
import { PresentationDocument, computeSlideLayout } from '@presentation-engine/index.js';
import { PresentationCanvas } from './PresentationCanvas.js';
import { SlideThumbnailStrip } from './SlideThumbnailStrip.js';
import { ExportModal } from './ExportModal.js';


interface SlideshowDisplayProps {
  result: any;
  currentSlide: number;
  setCurrentSlide: React.Dispatch<React.SetStateAction<number>>;
  setResult: React.Dispatch<React.SetStateAction<any>>;
  handleDownloadPDF: () => Promise<void>;
  isDownloadingPDF: boolean;
  slideshowTheme: 'light' | 'dark' | 'brand';
  setSlideshowTheme: React.Dispatch<React.SetStateAction<'light' | 'dark' | 'brand'>>;
  slideshowOverlay: number;
  setSlideshowOverlay: React.Dispatch<React.SetStateAction<number>>;
  slideshowFont: 'sans' | 'serif';
  setSlideshowFont: React.Dispatch<React.SetStateAction<'sans' | 'serif'>>;
  brandGuidelines: any;
  generateImage: (prompt: string, guidelines: any, aspectRatio?: string, model?: string, assets?: any[]) => Promise<any>;
  assets?: any[];
  cn: (...inputs: any[]) => string;
  aspectRatio?: string;
  selectedPresentationTheme?: any;
}

export const SlideshowDisplay: React.FC<SlideshowDisplayProps> = ({
  result,
  currentSlide,
  setCurrentSlide,
  setResult,
  handleDownloadPDF,
  isDownloadingPDF,
  slideshowTheme,
  setSlideshowTheme,
  slideshowOverlay,
  setSlideshowOverlay,
  slideshowFont,
  setSlideshowFont,
  brandGuidelines,
  generateImage,
  assets,
  cn,
  aspectRatio,
  selectedPresentationTheme
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load custom themes and select fallback if none provided
  const activeTheme = selectedPresentationTheme || {
    id: 'signature-brand',
    name: `Signature ${brandGuidelines.name}`,
    bg: brandGuidelines.colors?.[0] || '#0f172a',
    text: '#ffffff',
    accent: brandGuidelines.colors?.[1] || '#ec4899',
    secondary: '#94a3b8',
    font: brandGuidelines.typography?.primary || 'sans',
    overlay: 0.2,
    cardBg: 'rgba(15, 23, 42, 0.45)',
    border: 'rgba(255, 255, 255, 0.1)',
    lineStyle: `linear-gradient(90deg, ${brandGuidelines.colors?.[0] || '#0f172a'}, ${brandGuidelines.colors?.[1] || '#ec4899'})`
  };

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const canonicalDoc: PresentationDocument | undefined = result?.document;

  if (canonicalDoc && canonicalDoc.slides && canonicalDoc.slides.length > 0) {
    const activeSlide = canonicalDoc.slides[currentSlide] || canonicalDoc.slides[0];
    const bgImageUrl = (activeSlide as any).bgImage || (result.data?.[currentSlide]?.bgImage);

    const handleUpdateActiveSlide = (updatedSlide: any) => {
      const updatedSlides = [...canonicalDoc.slides];
      updatedSlides[currentSlide] = updatedSlide;
      const updatedDoc: PresentationDocument = {
        ...canonicalDoc,
        slides: updatedSlides,
        metadata: {
          ...canonicalDoc.metadata,
          updatedAt: new Date().toISOString()
        }
      };
      setResult({
        ...result,
        document: updatedDoc,
        data: updatedSlides
      });
    };

    const handleAddSlide = () => {
      const newIndex = canonicalDoc.slides.length;
      const { layout, elements } = computeSlideLayout(
        {
          id: `${canonicalDoc.id}_s${newIndex + 1}`,
          purpose: 'strategy',
          title: `Executive Strategic Pillar ${newIndex + 1}`,
          subtitle: 'Operational initiative description',
          bulletPoints: ['Key execution milestone', 'Measurable business objective'],
          logoAssetId: brandGuidelines?.logo?.id,
          brandName: brandGuidelines?.name || 'Brand'
        },
        canonicalDoc.theme,
        newIndex
      );

      const newSlide = {
        id: `${canonicalDoc.id}_s${newIndex + 1}`,
        index: newIndex,
        purpose: 'strategy' as const,
        layout,
        title: `Executive Strategic Pillar ${newIndex + 1}`,
        subtitle: 'Operational initiative description',
        elements,
        background: { type: 'color' as const, color: canonicalDoc.theme.colors.background },
        speakerNotes: 'Briefing notes for executive presentation.'
      };

      const updatedDoc: PresentationDocument = {
        ...canonicalDoc,
        slides: [...canonicalDoc.slides, newSlide],
        metadata: {
          ...canonicalDoc.metadata,
          targetSlideCount: canonicalDoc.slides.length + 1,
          updatedAt: new Date().toISOString()
        }
      };

      setResult({
        ...result,
        document: updatedDoc,
        data: updatedDoc.slides
      });
      setCurrentSlide(newIndex);
    };

    const handleDeleteSlide = (idx: number) => {
      if (canonicalDoc.slides.length <= 1) return;
      const updatedSlides = canonicalDoc.slides
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, index: i }));

      const updatedDoc: PresentationDocument = {
        ...canonicalDoc,
        slides: updatedSlides,
        metadata: {
          ...canonicalDoc.metadata,
          targetSlideCount: updatedSlides.length,
          updatedAt: new Date().toISOString()
        }
      };

      setResult({
        ...result,
        document: updatedDoc,
        data: updatedSlides
      });
      setCurrentSlide(Math.min(currentSlide, updatedSlides.length - 1));
    };

    return (
      <div className="w-full flex flex-col gap-4">
        {/* Top Executive Header & Export Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Corporate Presentation IR
            </span>
            <h2 className="text-sm md:text-base font-bold text-white truncate max-w-md">
              {canonicalDoc.title}
            </h2>
            <span className="text-[10px] text-slate-400 border border-white/10 px-2 py-0.5 rounded">
              v{canonicalDoc.schemaVersion}.{canonicalDoc.version}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">
              Slide {currentSlide + 1} of {canonicalDoc.slides.length}
            </span>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <FileDown className="w-4 h-4" />
              <span>Export Presentation</span>
            </button>
          </div>
        </div>

        {/* Presentation Canvas */}
        <PresentationCanvas
          slide={activeSlide}
          theme={canonicalDoc.theme}
          brandGuidelines={brandGuidelines}
          bgImageUrl={bgImageUrl}
          onUpdateSlide={handleUpdateActiveSlide}
        />

        {/* Thumbnail Strip */}
        <SlideThumbnailStrip
          slides={canonicalDoc.slides}
          currentSlideIndex={currentSlide}
          theme={canonicalDoc.theme}
          onSelectSlide={setCurrentSlide}
          onAddSlide={handleAddSlide}
          onDeleteSlide={handleDeleteSlide}
        />

        {/* Export Modal */}
        <ExportModal
          document={canonicalDoc}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      </div>
    );
  }

  const slide = result.data ? result.data[currentSlide] : null;
  if (!slide) return null;
  
  // Dynamic defaults for layouts and dragging
  const currentLayout = slide.layout || 'standard';
  const logoX = slide.logoX !== undefined ? slide.logoX : 82;
  const logoY = slide.logoY !== undefined ? slide.logoY : 8;
  const metricValue = slide.metricValue || '85%';
  const metricLabel = slide.metricLabel || 'Growth Velocity';

  // Handle Dragging Logo
  const handleLogoDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const handleDrag = (moveEvent: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      let clientX, clientY;
      if ('touches' in moveEvent) {
        if (moveEvent.touches.length === 0) return;
        clientX = moveEvent.touches[0].clientX;
        clientY = moveEvent.touches[0].clientY;
      } else {
        clientX = moveEvent.clientX;
        clientY = moveEvent.clientY;
      }
      
      const xPercent = ((clientX - rect.left) / rect.width) * 100;
      const yPercent = ((clientY - rect.top) / rect.height) * 100;
      
      // Keep it inside slide boundaries
      const newX = Math.max(2, Math.min(94, xPercent));
      const newY = Math.max(2, Math.min(94, yPercent));
      
      // Update result state
      const updatedSlides = [...result.data];
      updatedSlides[currentSlide] = {
        ...updatedSlides[currentSlide],
        logoX: Math.round(newX),
        logoY: Math.round(newY)
      };
      setResult({ ...result, data: updatedSlides });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('touchend', handleDragEnd);
    };

    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDrag);
    window.addEventListener('touchend', handleDragEnd);
  };

  // Change active slide layout mode
  const handleLayoutChange = (layout: 'standard' | 'split' | 'bento' | 'cover') => {
    const updatedSlides = [...result.data];
    updatedSlides[currentSlide] = {
      ...updatedSlides[currentSlide],
      layout
    };
    setResult({ ...result, data: updatedSlides });
  };

  // Update statistic elements
  const handleMetricChange = (field: 'metricValue' | 'metricLabel', value: string) => {
    const updatedSlides = [...result.data];
    updatedSlides[currentSlide] = {
      ...updatedSlides[currentSlide],
      [field]: value
    };
    setResult({ ...result, data: updatedSlides });
  };

  return (
    <div className="w-full max-w-5xl flex flex-col gap-6">
      {/* Slide Navigation and Canvas Settings Row */}
      <div className="flex flex-wrap items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
            disabled={currentSlide === 0}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full disabled:opacity-30 text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Slide {currentSlide + 1} of {result.data.length}
          </span>
          <button 
            onClick={() => setCurrentSlide(prev => Math.min(result.data.length - 1, prev + 1))}
            disabled={currentSlide === result.data.length - 1}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full disabled:opacity-30 text-slate-600 dark:text-slate-300"
          >
            <ChevronRightIcon size={20} />
          </button>
        </div>
        
        {/* Gemini Slide Canvas Controls */}
        <div className="flex items-center gap-2">
           <button 
            onClick={handleDownloadPDF}
            disabled={isDownloadingPDF}
            className="btn-secondary text-[10px] py-2 flex items-center gap-2"
          >
            {isDownloadingPDF ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileDown size={14} />
            )}
            {isDownloadingPDF ? 'GENERATING PDF...' : 'DOWNLOAD PDF'}
          </button>
          <button 
            onClick={() => {
              const newSlides = [...result.data];
              newSlides.splice(currentSlide + 1, 0, { 
                title: 'Strategic Expansion', 
                content: ['Enter localized high-growth micro-markets', 'Maximize core system ROI'], 
                imagePrompt: 'Corporate modern boardroom presentation background',
                layout: 'standard'
              });
              setResult({ ...result, data: newSlides });
              setCurrentSlide(currentSlide + 1);
            }}
            className="btn-secondary text-[10px] py-2 flex items-center gap-1.5"
          >
            <Plus size={14} /> ADD SLIDE
          </button>
          <button 
            onClick={() => {
              setResult(null);
              setCurrentSlide(0);
            }}
            className="btn-secondary text-[10px] py-2 text-red-500 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-1.5"
          >
            <Trash2 size={14} /> RESET
          </button>
          <button 
            onClick={() => {
              if (result.data.length <= 1) return;
              const newSlides = result.data.filter((_: any, i: number) => i !== currentSlide);
              setResult({ ...result, data: newSlides });
              setCurrentSlide(Math.max(0, currentSlide - 1));
            }}
            className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full"
            title="Delete Slide"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Gemini Slide Canvas Interactive Layout and Editor Header */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-rose-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Gemini Slide Canvas
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-1 rounded-full border border-rose-100/60 dark:border-rose-900/30">
            <CheckCircle size={10} />
            <span>Theme Active: {activeTheme.name}</span>
          </div>
        </div>

        {/* Layout Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'standard', name: 'Executive Standard', icon: Layout },
            { id: 'split', name: 'Split Screen Layout', icon: Columns },
            { id: 'bento', name: 'Modern Bento Grid', icon: Grid },
            { id: 'cover', name: 'Immersive Cover', icon: Sparkles }
          ].map((layoutOpt) => {
            const isCurrent = currentLayout === layoutOpt.id;
            const Icon = layoutOpt.icon;
            return (
              <button
                key={layoutOpt.id}
                type="button"
                onClick={() => handleLayoutChange(layoutOpt.id as any)}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer",
                  isCurrent
                    ? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-950 shadow-sm font-semibold"
                    : "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <Icon size={14} />
                <span>{layoutOpt.name}</span>
              </button>
            );
          })}
        </div>

        {/* Helpful Tip */}
        <div className="flex items-start gap-2 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850">
          <HelpCircle size={12} className="text-rose-400 mt-0.5 shrink-0" />
          <span>
            <strong>Canvas Interactive Feature:</strong> Reposition the logo anywhere on the slide by simple <strong>clicking and dragging</strong>. Your custom coordinates will be saved precisely.
          </span>
        </div>
      </div>

      {/* Main Draggable Slide Aspect Canvas Box */}
      <div 
        ref={containerRef}
        className="relative aspect-video bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 group/slide select-none"
        style={{ backgroundColor: activeTheme.bg }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide + '_' + currentLayout}
            initial={{ opacity: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            {/* Background Picture with Custom Overlay Opacity matching Theme */}
            {slide.image ? (
              <div className="absolute inset-0 z-0">
                <img 
                  src={slide.image} 
                  alt="Slide Graphic" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div 
                  className="absolute inset-0 transition-colors duration-500" 
                  style={{ 
                    backgroundColor: activeTheme.bg,
                    opacity: activeTheme.overlay 
                  }}
                />
              </div>
            ) : (
              <div className="absolute inset-0 z-0 overflow-hidden" style={{ backgroundColor: activeTheme.bg }}>
                <div className="skeleton w-full h-full opacity-10" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-slate-500">
                  <div className="relative">
                    <Loader2 className="animate-spin text-rose-500" size={40} />
                  </div>
                  <div className="space-y-1 text-center">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Generating Canvas Asset</span>
                    <p className="text-[10px] opacity-60 italic max-w-50 mx-auto line-clamp-1">{slide.imagePrompt}</p>
                  </div>

                </div>
              </div>
            )}

            {/* Draggable Logo Placement */}
            <div 
              onMouseDown={handleLogoDragStart}
              onTouchStart={handleLogoDragStart}
              className={cn(
                "absolute z-30 select-none cursor-move p-1.5 rounded-lg border hover:border-dashed hover:border-rose-400 hover:bg-white/20 dark:hover:bg-black/30 group/logo transition-all",
                isDragging ? "ring-2 ring-rose-500 border-rose-500 bg-white/40 dark:bg-black/40 scale-105 shadow-xl" : "border-transparent"
              )}
              style={{ 
                left: `${logoX}%`, 
                top: `${logoY}%`,
                transform: 'translate(-50%, -50%)',
                touchAction: 'none'
              }}
              title="Drag and change the logo placement!"
            >
              <BrandLogo customLogo={brandGuidelines.logo} brandName={brandGuidelines.name} noReferrer={false} />
              
              {/* Little visual handles */}
              <div className="absolute inset-0 border border-transparent group-hover/logo:border-rose-500/30 rounded-lg pointer-events-none" />
              <div className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-rose-500 rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity" />
              <div className="absolute -bottom-1 -right-1 w-1.5 h-1.5 bg-rose-500 rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity" />
            </div>

            {/* Slide Structure Engine - Dynamically Renders current layout */}
            <div 
              className={cn(
                "absolute inset-0 p-12 md:p-16 flex flex-col justify-center z-10",
                activeTheme.font === 'serif' ? 'font-serif' : (activeTheme.font === 'mono' ? 'font-mono' : 'font-sans')
              )}
              style={{ color: activeTheme.text }}
            >
              {/* COVER LAYOUT */}
              {currentLayout === 'cover' && (
                <div className="text-center space-y-6 max-w-3xl mx-auto flex flex-col items-center justify-center h-full">
                  <div 
                    className="h-1 w-24 rounded-full" 
                    style={{ background: activeTheme.lineStyle || activeTheme.accent }}
                  />
                  <input 
                    type="text"
                    value={slide.title}
                    onChange={(e) => {
                      const newSlides = [...result.data];
                      newSlides[currentSlide].title = e.target.value;
                      setResult({ ...result, data: newSlides });
                    }}
                    className="text-4xl md:text-5xl font-black bg-transparent border-none focus:outline-none focus:ring-0 text-center w-full focus:bg-white/10 dark:focus:bg-black/20 rounded px-2"
                    style={{ color: activeTheme.text }}
                  />
                  
                  <div className="space-y-4 w-full">
                    {slide.content.map((point: string, pIdx: number) => (
                      <textarea 
                        key={pIdx}
                        value={point}
                        onChange={(e) => {
                          const newSlides = [...result.data];
                          newSlides[currentSlide].content[pIdx] = e.target.value;
                          setResult({ ...result, data: newSlides });
                        }}
                        className="text-lg md:text-xl text-center bg-transparent border-none focus:outline-none focus:ring-0 w-full resize-none h-auto px-2 opacity-90 focus:bg-white/10 dark:focus:bg-black/20 rounded"
                        style={{ color: activeTheme.text }}
                        rows={1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SPLIT SCREEN LAYOUT */}
              {currentLayout === 'split' && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center h-full">
                  {/* Text Left side */}
                  <div 
                    className="col-span-3 p-8 rounded-2xl border flex flex-col justify-center space-y-6"
                    style={{ 
                      backgroundColor: activeTheme.cardBg, 
                      borderColor: activeTheme.border 
                    }}
                  >
                    <div 
                      className="h-1 w-20 rounded-full" 
                      style={{ background: activeTheme.lineStyle || activeTheme.accent }}
                    />
                    <input 
                      type="text"
                      value={slide.title}
                      onChange={(e) => {
                        const newSlides = [...result.data];
                        newSlides[currentSlide].title = e.target.value;
                        setResult({ ...result, data: newSlides });
                      }}
                      className="text-3xl md:text-4xl font-black bg-transparent border-none focus:outline-none focus:ring-0 w-full focus:bg-white/10 dark:focus:bg-black/20 rounded"
                      style={{ color: activeTheme.text }}
                    />
                    <div className="space-y-4">
                      {slide.content.map((point: string, pIdx: number) => (
                        <div key={pIdx} className="flex items-start gap-3 group/pt">
                          <div className="mt-2 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeTheme.accent }} />
                          <textarea 
                            value={point}
                            onChange={(e) => {
                              const newSlides = [...result.data];
                              newSlides[currentSlide].content[pIdx] = e.target.value;
                              setResult({ ...result, data: newSlides });
                            }}
                            className="text-sm md:text-base leading-relaxed bg-transparent border-none focus:outline-none focus:ring-0 w-full resize-none h-auto focus:bg-white/10 dark:focus:bg-black/20 rounded"
                            style={{ color: activeTheme.text }}
                            rows={1}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Frame Right side */}
                  <div className="col-span-2 h-full flex items-center justify-center">
                    {slide.image && (
                      <div className="relative w-full aspect-square md:h-full rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                        <img 
                          src={slide.image} 
                          alt="Layout framed" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent" />

                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BENTO DASHBOARD GRID LAYOUT */}
              {currentLayout === 'bento' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-stretch">
                  {/* Big content card */}
                  <div 
                    className="col-span-2 p-8 rounded-2xl border flex flex-col justify-center space-y-4"
                    style={{ 
                      backgroundColor: activeTheme.cardBg, 
                      borderColor: activeTheme.border 
                    }}
                  >
                    <div 
                      className="h-1 w-16 rounded-full" 
                      style={{ background: activeTheme.lineStyle || activeTheme.accent }}
                    />
                    <input 
                      type="text"
                      value={slide.title}
                      onChange={(e) => {
                        const newSlides = [...result.data];
                        newSlides[currentSlide].title = e.target.value;
                        setResult({ ...result, data: newSlides });
                      }}
                      className="text-2xl md:text-3xl font-black bg-transparent border-none focus:outline-none focus:ring-0 w-full focus:bg-white/10 dark:focus:bg-black/20 rounded"
                      style={{ color: activeTheme.text }}
                    />
                    <div className="space-y-2">
                      {slide.content.map((point: string, pIdx: number) => (
                        <div key={pIdx} className="flex items-start gap-2.5">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: activeTheme.accent }} />
                          <textarea 
                            value={point}
                            onChange={(e) => {
                              const newSlides = [...result.data];
                              newSlides[currentSlide].content[pIdx] = e.target.value;
                              setResult({ ...result, data: newSlides });
                            }}
                            className="text-xs md:text-sm leading-relaxed bg-transparent border-none focus:outline-none focus:ring-0 w-full resize-none h-auto focus:bg-white/10 dark:focus:bg-black/20 rounded"
                            style={{ color: activeTheme.text }}
                            rows={1}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right side stats & media bento stack */}
                  <div className="col-span-1 flex flex-col gap-4">
                    {/* Stat card */}
                    <div 
                      className="flex-1 p-6 rounded-2xl border flex flex-col justify-center items-center text-center relative overflow-hidden"
                      style={{ 
                        backgroundColor: activeTheme.cardBg, 
                        borderColor: activeTheme.border 
                      }}
                    >
                      <TrendingUp size={20} className="text-rose-500 mb-2 opacity-80" />
                      
                      {/* Metric input field */}
                      <input 
                        type="text"
                        value={metricValue}
                        onChange={(e) => handleMetricChange('metricValue', e.target.value)}
                        className="text-4xl font-black bg-transparent border-none text-center focus:outline-none focus:ring-0 w-full focus:bg-white/10 dark:focus:bg-black/20 rounded"
                        style={{ color: activeTheme.text }}
                      />
                      
                      {/* Metric label input field */}
                      <input 
                        type="text"
                        value={metricLabel}
                        onChange={(e) => handleMetricChange('metricLabel', e.target.value)}
                        className="text-[10px] font-bold uppercase tracking-wider text-center mt-1 bg-transparent border-none focus:outline-none focus:ring-0 w-full focus:bg-white/10 dark:focus:bg-black/20 rounded"
                        style={{ color: activeTheme.secondary }}
                      />
                    </div>

                    {/* Small thumbnail card */}
                    {slide.image && (
                      <div className="h-28 rounded-2xl overflow-hidden border border-white/15 relative">
                        <img 
                          src={slide.image} 
                          alt="bento thumbnail" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EXECUTIVE STANDARD LAYOUT (Default) */}
              {currentLayout === 'standard' && (
                <div className="space-y-6 max-w-4xl">
                  <div className="space-y-4">
                    <div 
                      className="h-1.5 w-24 rounded-full" 
                      style={{ background: activeTheme.lineStyle || activeTheme.accent }}
                    />
                    <div className="flex items-center justify-between gap-4">
                      <input 
                        type="text"
                        value={slide.title}
                        onChange={(e) => {
                          const newSlides = [...result.data];
                          newSlides[currentSlide].title = e.target.value;
                          setResult({ ...result, data: newSlides });
                        }}
                        className="text-4xl md:text-5xl font-black bg-transparent border-none focus:outline-none focus:ring-0 w-full focus:bg-white/10 dark:focus:bg-black/20 rounded px-1"
                        style={{ color: activeTheme.text }}
                      />
                      <button 
                        onClick={async () => {
                          const newSlides = [...result.data];
                          newSlides[currentSlide].image = undefined;
                          setResult({ ...result, data: newSlides });
                          try {
                            const selectedAssets = assets?.filter(a => a.selected) || [];
                            const imageResult = await generateImage(newSlides[currentSlide].imagePrompt, brandGuidelines, aspectRatio || "16:9", undefined, selectedAssets);
                            newSlides[currentSlide].image = imageResult.url;
                            newSlides[currentSlide].groundingMetadata = imageResult.groundingMetadata;
                            setResult({ ...result, data: [...newSlides] });
                          } catch (e) {
                            console.error("Failed to regenerate slide image:", e);
                          }
                        }}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/50 hover:text-white transition-all opacity-0 group-hover/slide:opacity-100"
                        title="Regenerate Visual Asset"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {slide.content.map((point: string, pIdx: number) => (
                      <div key={pIdx} className="flex items-start gap-5 group/pt">
                        <div className="mt-3.5 w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: activeTheme.accent }} />
                        <div className="flex-1 flex items-center gap-4">
                          <textarea 
                            value={point}
                            onChange={(e) => {
                              const newSlides = [...result.data];
                              newSlides[currentSlide].content[pIdx] = e.target.value;
                              setResult({ ...result, data: newSlides });
                            }}
                            className="text-xl md:text-2xl leading-relaxed bg-transparent border-none focus:outline-none focus:ring-0 w-full resize-none h-auto px-1 focus:bg-white/10 dark:focus:bg-black/20 rounded"
                            style={{ color: activeTheme.text }}
                            rows={1}
                          />
                          <button 
                            onClick={() => {
                              const newSlides = [...result.data];
                              newSlides[currentSlide].content = newSlides[currentSlide].content.filter((_: any, i: number) => i !== pIdx);
                              setResult({ ...result, data: newSlides });
                            }}
                            className="opacity-0 group-hover/pt:opacity-100 p-1 text-red-400 hover:text-red-500 transition-opacity"
                            title="Remove Point"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => {
                        const newSlides = [...result.data];
                        newSlides[currentSlide].content.push('New strategic point');
                        setResult({ ...result, data: newSlides });
                      }}
                      className="flex items-center gap-2 text-sm font-bold opacity-0 group-hover/slide:opacity-100 transition-opacity"
                      style={{ color: activeTheme.accent }}
                    >
                      <Plus size={16} /> ADD POINT
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-2 z-20" style={{ background: activeTheme.lineStyle || activeTheme.accent }} />
            
            {/* Soft decorative visual gradients under the themes */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ backgroundColor: activeTheme.accent }} />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-5 pointer-events-none" style={{ backgroundColor: activeTheme.secondary }} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
