import React from 'react';
import { Sparkles, Layers, Image as ImageIcon, Video as VideoIcon, FileText, LayoutDashboard, Presentation, Target, BookOpen, Volume2, Music } from 'lucide-react';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { IMAGE_MODELS, VIDEO_MODELS, TEXT_MODELS } from '@web/infrastructure/ai/modelRegistry.js';
import { cn } from '@web/lib/utils.js';
import { CreativeOutputCanvas } from './CreativeOutputCanvas.js';
import { CreativeCommandBar } from './CreativeCommandBar.js';
import { SoftWarningModal } from '../modals/SoftWarningModal.js';
import { RefinePromptModal } from '../modals/RefinePromptModal.js';
import { type TextWordLayer } from '../../canvas/hooks/useCanvasEditor.js';

export interface CreativeWorkspaceProps {
  selectedGem: Gem;
  brandGuidelines: BrandGuidelines;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  videoShotType: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling';
  setVideoShotType: (type: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling') => void;
  imageStyle: string;
  setImageStyle: (style: string) => void;
  bakeLogoOnGeneration: boolean;
  setBakeLogoOnGeneration: React.Dispatch<React.SetStateAction<boolean>>;
  voiceEmotion: 'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming';
  setVoiceEmotion: (emotion: 'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming') => void;
  // Output canvas & command bar props
  result: any;
  setResult: React.Dispatch<React.SetStateAction<any>>;
  isGenerating: boolean;
  videoStatus: string;
  prompt: string;
  setPrompt: (val: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  isGeneratingCreativePrompt: boolean;
  setIsGeneratingCreativePrompt: (val: boolean) => void;
  productContext: { id: string; name: string; data: string } | null;
  setProductContext: (val: { id: string; name: string; data: string } | null) => void;
  faceContext: { id: string; name: string; data: string } | null;
  setFaceContext: (val: { id: string; name: string; data: string } | null) => void;
  firstFrameContext: { id: string; name: string; data: string } | null;
  setFirstFrameContext: (val: { id: string; name: string; data: string } | null) => void;
  lastFrameContext: { id: string; name: string; data: string } | null;
  setLastFrameContext: (val: { id: string; name: string; data: string } | null) => void;
  ingredientsContexts: { id: string; name: string; data: string }[];
  setIngredientsContexts: React.Dispatch<React.SetStateAction<{ id: string; name: string; data: string }[]>>;
  selectedPresentationTheme: any;
  setSelectedPresentationTheme: (theme: any) => void;
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
  handleDownloadPDF: () => Promise<void>;
  isDownloadingPDF: boolean;
  // Storyline
  isDownloadingZip: boolean;
  handleDownloadStorylineZip: () => Promise<void>;
  // Modals & Warnings
  softWarning: any;
  setSoftWarning: (val: any) => void;
  isRefineModalOpen: boolean;
  setIsRefineModalOpen: (val: boolean) => void;
  refinePrompt: string;
  setRefinePrompt: (val: string) => void;
  isRefining: boolean;
  handleRefineWithAI: () => Promise<void>;
  setHumanTouchItem: (item: any) => void;
  setHumanTouchComment: (val: string) => void;
  setHumanTouchSuccessMsg: (val: string | null) => void;
  getBrandStyles: () => React.CSSProperties;
  handleGenerate: () => Promise<void>;
}

export const CreativeWorkspace: React.FC<CreativeWorkspaceProps> = (props) => {
  const {
    selectedGem,
    brandGuidelines,
    aspectRatio,
    setAspectRatio,
    selectedModel,
    setSelectedModel,
    videoShotType,
    setVideoShotType,
    imageStyle,
    setImageStyle,
    bakeLogoOnGeneration,
    setBakeLogoOnGeneration,
    voiceEmotion,
    setVoiceEmotion,
    softWarning,
    setSoftWarning,
    isRefineModalOpen,
    setIsRefineModalOpen,
    refinePrompt,
    setRefinePrompt,
    isRefining,
    handleRefineWithAI,
    handleGenerate
  } = props;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Image': return <ImageIcon size={20} />;
      case 'Video': return <VideoIcon size={20} />;
      case 'FileText': return <FileText size={20} />;
      case 'LayoutDashboard': return <LayoutDashboard size={20} />;
      case 'Presentation': return <Presentation size={20} />;
      case 'Target': return <Target size={20} />;
      case 'BookOpen': return <BookOpen size={20} />;
      case 'Layers': return <Layers size={20} />;
      case 'Volume2': return <Volume2 size={20} />;
      case 'Music': return <Music size={20} />;
      default: return <Sparkles size={20} />;
    }
  };

  return (
    <>
      {/* Gem Header */}
      <div className="space-y-2 pb-1 text-left">
        <div className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
          {getIcon(selectedGem.icon)}
          {selectedGem.id === 'corporate-presentations' ? 'PPT' : selectedGem.type} Engine
        </div>
        <h1 className="text-3xl md:text-4xl font-light text-slate-950 dark:text-slate-50 tracking-tight">
          {selectedGem.name}. <span className="text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">Simplified.</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-4xl text-sm font-light leading-relaxed">
          {selectedGem.description}
        </p>
      </div>
      
      {/* Parameter Controls Toolbar Block */}
      <div className="flex flex-wrap items-stretch gap-4">
        {selectedGem.type !== 'text' && selectedGem.type !== 'audio' && selectedGem.id !== 'corporate-presentations' && (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Aspect Ratio</span>
            {(selectedGem.type === 'video' ? ['16:9', '9:16'] : (selectedGem.type === 'storyline' ? ['1:1', '16:9', '9:16'] : ['1:1', '16:9', '9:16', '4:3'])).map(ratio => (
               <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={cn(
                  "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                  aspectRatio === ratio 
                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {ratio}
              </button>
            ))}
          </div>
        )}

        {(selectedGem.type === 'image' || selectedGem.type === 'video' || selectedGem.type === 'text' || selectedGem.type === 'campaign' || selectedGem.type === 'slideshow' || selectedGem.type === 'storyline') && (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Model Quality</span>
            {(selectedGem.type === 'image' ? IMAGE_MODELS : (selectedGem.type === 'video' ? VIDEO_MODELS : TEXT_MODELS)).map(model => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={cn(
                  "px-3 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer",
                  selectedModel === model.id 
                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
                title={`${'modelName' in model ? (model as any).modelName : ''} — ${model.description} (${('credits' in model ? (model as any).credits : selectedGem.cost)} credits)`}
              >
                {(model.id.includes('3.1') || model.id === 'veo-3.1-generate-preview') && <Sparkles size={12} />}
                <span className="flex items-center gap-1">
                  <span>{model.name}</span>
                  <span className="text-[10px] opacity-75 font-normal">
                    ({'credits' in model ? (model as any).credits : selectedGem.cost}c)
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedGem.type === 'video' && (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Shot Type</span>
            {(['Single Shot', 'Multi-Shot Sequence', 'Cinematic Storytelling'] as const).map(type => (
              <button
                key={type}
                onClick={() => setVideoShotType(type)}
                className={cn(
                  "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                  videoShotType === type 
                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {selectedGem.type === 'image' && (
          <>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm flex-1 min-w-50 max-w-sm">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider shrink-0">Style</span>

              <input 
                type="text"
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                placeholder="e.g., Photorealistic, 3D Render, Minimalist"
                className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>

            <button
              type="button"
              onClick={() => setBakeLogoOnGeneration(prev => !prev)}
              className={cn(
                "px-3 py-2 rounded-sm text-xs font-bold transition-all border flex items-center gap-2 shadow-sm cursor-pointer",
                !bakeLogoOnGeneration
                  ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
              title="Toggle between embedding Logo directly inside image pixels or displaying a interactive overlay."
            >
              <Layers size={13} className={!bakeLogoOnGeneration ? "text-rose-500" : "text-slate-400"} />
              {!bakeLogoOnGeneration ? "Interactive Logo Layer" : "Bake Logo Immediately"}
            </button>
          </>
        )}

        {selectedGem.type === 'text' && (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Voice Emotion</span>
            {(['Neutral', 'Cheerful', 'Energetic', 'Professional', 'Calming'] as const).map(emotion => (
              <button
                key={emotion}
                onClick={() => setVoiceEmotion(emotion)}
                className={cn(
                  "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                  voiceEmotion === emotion 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white" 
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {emotion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Model capabilities / possibilities display */}
      {(selectedGem.type === 'image' || selectedGem.type === 'video') && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 bg-slate-50/70 dark:bg-slate-900/30 rounded-sm border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 w-full select-none animate-in fade-in slide-in-from-top-1">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
            Model Support
          </span>
          <span className="hidden sm:inline h-3.5 w-px bg-slate-200 dark:bg-slate-800" />
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            Active Model: <span className="text-slate-900 dark:text-slate-100 font-bold">
              {selectedGem.type === 'image' ? (
                (() => {
                  const m = IMAGE_MODELS.find(x => x.id === selectedModel);
                  return m ? m.name : selectedModel;
                })()
              ) : (
                (() => {
                  const m = VIDEO_MODELS.find(x => x.id === selectedModel);
                  return m ? m.name : selectedModel;
                })()
              )}
            </span>
          </span>
          
          {selectedGem.type === 'image' ? (
            <>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                Logo Overlay: 
                <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'openai/gpt-image-2' ? "text-slate-450 dark:text-slate-500" : "text-emerald-600 dark:text-emerald-400")}>
                  {selectedModel === 'openai/gpt-image-2' ? 'Unsupported' : 'Supported'}
                </span>
              </span>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                Face Reference: 
                <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", (selectedModel.includes('gemini-3') || selectedModel === 'openai/gpt-image-2') ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                  {(selectedModel.includes('gemini-3') || selectedModel === 'openai/gpt-image-2') ? 'Supported' : 'Unsupported'}
                </span>
              </span>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                Product Placement: 
                <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'openai/gpt-image-2' ? "text-emerald-600 dark:text-emerald-400" : (selectedModel === 'gemini-2.5-flash-image' ? "text-amber-600 dark:text-amber-500 font-bold" : "text-emerald-600 dark:text-emerald-400"))}>
                  {selectedModel === 'openai/gpt-image-2' ? 'Supported' : (selectedModel === 'gemini-2.5-flash-image' ? 'Inspirational Only' : 'Supported')}
                </span>
              </span>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                Ingredients Input: 
                <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'openai/gpt-image-2' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                  {selectedModel === 'openai/gpt-image-2' ? 'Supported' : 'Unsupported'}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                First Frame Input: 
                <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel !== 'veo-3.1-lite-generate-preview' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                  {selectedModel !== 'veo-3.1-lite-generate-preview' ? 'Supported' : 'Unsupported'}
                </span>
              </span>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                Last Frame Input: 
                <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'veo-3.1-generate-preview' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                  {selectedModel === 'veo-3.1-generate-preview' ? 'Supported' : 'Unsupported'}
                </span>
              </span>
              <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
              <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                Ingredients Input: 
                <span className={cn("font-bold text-[10px] px-1 bg-slate-100 dark:bg-slate-800/80 rounded-xs", selectedModel === 'veo-3.1-generate-preview' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500")}>
                  {selectedModel === 'veo-3.1-generate-preview' ? 'Supported' : 'Unsupported'}
                </span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Output Canvas Area */}
      <CreativeOutputCanvas {...props} />

      {/* Command Bar Area */}
      <CreativeCommandBar 
        selectedGem={props.selectedGem}
        brandGuidelines={props.brandGuidelines}
        selectedLanguage={props.selectedLanguage}
        setSelectedLanguage={props.setSelectedLanguage}
        selectedVoice={props.selectedVoice}
        setSelectedVoice={props.setSelectedVoice}
        isGeneratingCreativePrompt={props.isGeneratingCreativePrompt}
        setIsGeneratingCreativePrompt={props.setIsGeneratingCreativePrompt}
        prompt={props.prompt}
        setPrompt={props.setPrompt}
        productContext={props.productContext}
        setProductContext={props.setProductContext}
        faceContext={props.faceContext}
        setFaceContext={props.setFaceContext}
        firstFrameContext={props.firstFrameContext}
        setFirstFrameContext={props.setFirstFrameContext}
        lastFrameContext={props.lastFrameContext}
        setLastFrameContext={props.setLastFrameContext}
        ingredientsContexts={props.ingredientsContexts}
        setIngredientsContexts={props.setIngredientsContexts}
        selectedModel={props.selectedModel}
        selectedPresentationTheme={props.selectedPresentationTheme}
        setSelectedPresentationTheme={props.setSelectedPresentationTheme}
        isGenerating={props.isGenerating}
        handleGenerate={props.handleGenerate}
      />

      {/* Soft Warning Modal */}
      <SoftWarningModal 
        softWarning={softWarning}
        onClose={() => setSoftWarning(null)}
        onProceed={async () => {
          const action = softWarning?.onProceed;
          setSoftWarning(null);
          if (action) await action();
        }}
        onSwitchModel={(modelId) => {
          setSelectedModel(modelId);
          setSoftWarning(null);
        }}
      />

      {/* Refine Prompt Modal */}
      <RefinePromptModal 
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        refinePrompt={refinePrompt}
        setRefinePrompt={setRefinePrompt}
        onRefine={handleRefineWithAI}
        isRefining={isRefining}
      />
    </>
  );
};
