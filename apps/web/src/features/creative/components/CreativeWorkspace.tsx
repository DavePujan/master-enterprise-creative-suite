import React, { useState, useEffect } from 'react';
import { Sparkles, Layers, Image as ImageIcon, Video as VideoIcon, FileText, LayoutDashboard, Presentation, Target, BookOpen, Volume2, Music, Check } from 'lucide-react';
import { AppIcon, ProviderBadge } from '@web/shared/components/icons/AppIconRegistry.js';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import type { CapabilityDetail } from '@shared-types/imageGeneration.js';
import { IMAGE_MODELS, VIDEO_MODELS, TEXT_MODELS, getImageModelCapabilities, getVideoModelCapabilities } from '@web/infrastructure/ai/modelRegistry.js';
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
  videoDuration?: string;
  setVideoDuration?: (duration: string) => void;
  videoResolution?: '720p' | '1080p' | '4k';
  setVideoResolution?: (res: '720p' | '1080p' | '4k') => void;
  videoAudioIntent?: 'none' | 'ambient' | 'music' | 'sfx' | 'cinematic_soundscape';
  setVideoAudioIntent?: (intent: 'none' | 'ambient' | 'music' | 'sfx' | 'cinematic_soundscape') => void;
  videoNativeAudio?: boolean;
  setVideoNativeAudio?: (val: boolean) => void;
  videoReferences?: Array<{ id: string; type: string; name: string; data: string; role?: string }>;
  setVideoReferences?: React.Dispatch<React.SetStateAction<Array<{ id: string; type: string; name: string; data: string; role?: string }>>>;
  klingElements?: Array<{ id: string; tag: string; name: string; data: string }>;
  setKlingElements?: React.Dispatch<React.SetStateAction<Array<{ id: string; tag: string; name: string; data: string }>>>;
  imageStyle: string;
  setImageStyle: (style: string) => void;
  bakeLogoOnGeneration: boolean;
  setBakeLogoOnGeneration: React.Dispatch<React.SetStateAction<boolean>>;
  voiceEmotion: 'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming' | 'Dramatic';
  setVoiceEmotion: (emotion: 'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming' | 'Dramatic') => void;
  // Output canvas & command bar props
  result: any;
  setResult: React.Dispatch<React.SetStateAction<any>>;
  isGenerating: boolean;
  videoStatus: string;
  executeVideoEdit?: (instruction: string) => Promise<void>;
  prompt: string;
  setPrompt: (val: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  audioGenerationType?: 'voiceover' | 'music';
  setAudioGenerationType?: (val: 'voiceover' | 'music') => void;
  musicMode?: 'clip' | 'full-track';
  setMusicMode?: (val: 'clip' | 'full-track') => void;
  musicGenre?: string;
  setMusicGenre?: (val: string) => void;
  musicMood?: string;
  setMusicMood?: (val: string) => void;
  speakerMode?: 'single' | 'two-speaker';
  setSpeakerMode?: (val: 'single' | 'two-speaker') => void;
  speakerTwoVoice?: string;
  setSpeakerTwoVoice?: (val: string) => void;
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
  handleTTS: (text: string, forceBrowserVoice?: boolean) => Promise<void>;
  handleDownloadAudio: () => void;
  ttsError?: string | null;
  setTtsError?: (err: string | null) => void;
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

const renderCapabilityPill = (label: string, detail?: CapabilityDetail | boolean) => {
  if (detail === undefined || detail === null) return null;
  if (typeof detail === 'boolean') {
    const colorClass = detail
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
      : "bg-slate-500/10 text-slate-450 dark:text-slate-500 border border-slate-500/20";
    return (
      <span
        className="flex items-center gap-1 text-slate-650 dark:text-slate-350 cursor-help transition-opacity hover:opacity-90"
        title={`${label}: ${detail ? 'Supported' : 'Unsupported'}`}
      >
        {label}:
        <span className={cn("font-bold text-[10px] px-1.5 py-0.5 rounded-xs tracking-tight shadow-xs", colorClass)}>
          {detail ? 'Native' : 'Unavailable'}
        </span>
      </span>
    );
  }
  const status = detail.status;
  let colorClass = "bg-slate-500/10 text-slate-450 dark:text-slate-500 border border-slate-500/20";
  if (status === "native") {
    colorClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
  } else if (status === "application") {
    colorClass = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20";
  } else if (status === "reference") {
    colorClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
  } else if (status === "prompt") {
    colorClass = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20";
  } else if (status === "unsupported") {
    colorClass = "bg-slate-500/10 text-slate-450 dark:text-slate-500 border border-slate-500/20";
  }

  const tooltip = `${detail.badgeLabel}: ${detail.reason}${detail.parameter ? ` (Parameter: ${detail.parameter})` : ''}`;

  return (
    <span
      className="flex items-center gap-1 text-slate-650 dark:text-slate-350 cursor-help transition-opacity hover:opacity-90"
      title={tooltip}
    >
      {label}:
      <span className={cn("font-bold text-[10px] px-1.5 py-0.5 rounded-xs tracking-tight shadow-xs", colorClass)}>
        {detail.badgeLabel}
      </span>
    </span>
  );
};

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
    videoDuration,
    setVideoDuration,
    videoResolution,
    setVideoResolution,
    videoAudioIntent,
    setVideoAudioIntent,
    videoNativeAudio,
    setVideoNativeAudio,
    videoReferences,
    setVideoReferences,
    klingElements,
    setKlingElements,
    imageStyle,
    setImageStyle,
    bakeLogoOnGeneration,
    setBakeLogoOnGeneration,
    voiceEmotion = 'Professional',
    setVoiceEmotion,
    audioGenerationType = 'voiceover',
    setAudioGenerationType,
    musicMode = 'clip',
    setMusicMode,
    musicGenre = 'Cinematic',
    setMusicGenre,
    musicMood = 'Uplifting',
    setMusicMood,
    speakerMode = 'single',
    setSpeakerMode,
    speakerTwoVoice = 'Puck',
    setSpeakerTwoVoice,
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

  // Auto-reconcile video parameters whenever selectedModel or selectedGem changes
  useEffect(() => {
    if (selectedGem.type === 'video') {
      const vCaps = getVideoModelCapabilities(selectedModel);
      if (!vCaps.aspectRatios.includes(aspectRatio) && !vCaps.aspectRatios.includes('auto')) {
        setAspectRatio(vCaps.aspectRatios[0] || '16:9');
      }
      if (videoDuration && !vCaps.supportedDurations.includes(videoDuration)) {
        setVideoDuration?.(vCaps.supportedDurations[0] || '8s');
      }
      if (!vCaps.supportsMultiShot && videoShotType === 'Multi-Shot Sequence') {
        setVideoShotType('Single Shot');
      }
      if (videoResolution && !vCaps.supportedResolutions.includes(videoResolution as any)) {
        setVideoResolution?.(vCaps.supportedResolutions[0]);
      }
    }
  }, [selectedModel, selectedGem.type]);

  // Check for staged campaign strategy briefs
  const [stagedBrief, setStagedBrief] = useState<any | null>(null);
  const [stagedCampaignTitle, setStagedCampaignTitle] = useState<string>('');
  const [isStagedDismissed, setIsStagedDismissed] = useState(false);
  const [isBriefApplied, setIsBriefApplied] = useState(false);

  useEffect(() => {
    try {
      const campaignTitle = localStorage.getItem('staged_campaign_title') || '';
      setStagedCampaignTitle(campaignTitle);
      setIsStagedDismissed(false);
      setIsBriefApplied(false);

      let rawBrief: string | null = null;
      if (selectedGem?.type === 'text') {
        rawBrief = localStorage.getItem('staged_text_brief');
      } else if (selectedGem?.type === 'image') {
        rawBrief = localStorage.getItem('staged_image_brief');
      } else if (selectedGem?.type === 'video') {
        rawBrief = localStorage.getItem('staged_video_brief');
      } else if (selectedGem?.type === 'audio') {
        rawBrief = localStorage.getItem('staged_audio_brief');
      } else if (selectedGem?.id === 'corporate-presentations' || selectedGem?.type === 'slideshow') {
        rawBrief = localStorage.getItem('staged_deck_brief');
      }

      if (rawBrief) {
        const parsed = JSON.parse(rawBrief);
        setStagedBrief(parsed);
      } else {
        setStagedBrief(null);
      }
    } catch (e) {
      console.warn('Error reading staged brief:', e);
      setStagedBrief(null);
    }
  }, [selectedGem?.id, selectedGem?.type]);

  const handleApplyStagedBrief = () => {
    if (!stagedBrief) return;

    if (selectedGem.type === 'text') {
      const p = stagedBrief.suggestedPrompt || `${stagedBrief.coreHook}\n\nAngle: ${stagedBrief.angle}\nTone: ${stagedBrief.tone}\nCTA: ${stagedBrief.callToAction}`;
      props.setPrompt(p);
    } else if (selectedGem.type === 'image') {
      if (stagedBrief.prompt || stagedBrief.textlessPrompt) {
        props.setPrompt(stagedBrief.prompt || stagedBrief.textlessPrompt);
      }
      if (stagedBrief.aspectRatio || stagedBrief.aspectRatios?.[0]) {
        props.setAspectRatio(stagedBrief.aspectRatio || stagedBrief.aspectRatios[0]);
      }
    } else if (selectedGem.type === 'video') {
      if (stagedBrief.prompt || stagedBrief.textlessPrompt) {
        props.setPrompt(stagedBrief.prompt || stagedBrief.textlessPrompt);
      }
      if (stagedBrief.aspectRatio) {
        props.setAspectRatio(stagedBrief.aspectRatio);
      }
    } else if (selectedGem.type === 'audio') {
      if (stagedBrief.prompt || stagedBrief.spokenScriptText || stagedBrief.scriptIntent) {
        props.setPrompt(stagedBrief.prompt || stagedBrief.spokenScriptText || stagedBrief.scriptIntent);
      }
      if (props.setAudioGenerationType) {
        props.setAudioGenerationType('voiceover');
      }
      if (props.setSelectedLanguage && stagedBrief.language) {
        props.setSelectedLanguage(stagedBrief.language);
      }
      if (props.setMusicMood && (stagedBrief.musicMood || stagedBrief.mood)) {
        props.setMusicMood(stagedBrief.musicMood || stagedBrief.mood);
      }
    } else if (selectedGem.id === 'corporate-presentations' || selectedGem.type === 'slideshow') {
      const slides = stagedBrief.slides || [];
      const deckPrompt = `Create a ${slides.length > 0 ? `${slides.length}-slide ` : ''}corporate presentation for: ${stagedBrief.campaignTitle || stagedCampaignTitle}.\n` +
        (slides.length > 0 ? `Key Slides: ${slides.map((s: any) => `${s.slideNumber || ''}. ${s.slideTitle || ''}`).join(', ')}` : '');
      props.setPrompt(deckPrompt);
    }

    setIsBriefApplied(true);
  };

  const handleDismissStagedBrief = () => {
    setIsStagedDismissed(true);
  };

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
      {/* Staged Campaign Brief Banner */}
      {stagedBrief && !isStagedDismissed && (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-emerald-500/10 border border-rose-500/20 rounded-md p-3.5 mb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs text-left">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md shrink-0 mt-0.5">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Staged from Campaign Strategist:
                </span>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {stagedBrief.campaignTitle || stagedCampaignTitle || 'Active Campaign'}
                </span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold rounded">
                  {selectedGem.type} brief ready
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                {stagedBrief.visualConcept || stagedBrief.coreHook || stagedBrief.sceneDescription || stagedBrief.scriptIntent || stagedBrief.summary || 'Deterministic brief ready for production.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleApplyStagedBrief}
              disabled={isBriefApplied}
              className={`px-3.5 py-1.5 text-xs font-bold rounded shadow-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                isBriefApplied
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {isBriefApplied ? (
                <>
                  <Check size={13} /> Applied to Prompt
                </>
              ) : (
                <>
                  <Sparkles size={13} /> Apply to Prompt
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDismissStagedBrief}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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
            {(() => {
              let ratios: string[] = ['1:1', '16:9', '9:16', '4:3'];
              if (selectedGem.type === 'video') {
                const vCaps = getVideoModelCapabilities(selectedModel);
                ratios = vCaps.aspectRatios || ['16:9', '9:16'];
              } else if (selectedGem.type === 'storyline') {
                ratios = ['1:1', '16:9', '9:16'];
              }
              return ratios.map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={cn(
                    "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5",
                    aspectRatio === ratio 
                      ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  {ratio === '16:9' && <AppIcon name="aspect-16-9" size={12} strokeWidth={2} />}
                  {ratio === '9:16' && <AppIcon name="aspect-9-16" size={12} strokeWidth={2} />}
                  {ratio === '1:1' && <AppIcon name="aspect-1-1" size={12} strokeWidth={2} />}
                  <span>{ratio}</span>
                </button>
              ));
            })()}
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
                  "px-3 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer",
                  selectedModel === model.id 
                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm" 
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
                title={`${'modelName' in model ? (model as any).modelName : ''} — ${model.description} (${('credits' in model ? (model as any).credits : selectedGem.cost)} credits)`}
              >
                <span>{model.name}</span>
                <span className="text-[10px] opacity-70 font-mono font-normal">
                  ({'credits' in model ? (model as any).credits : selectedGem.cost}c)
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedGem.type === 'video' && (
          <>
            {/* Dynamic Model-Supported Duration Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Duration</span>
              {(() => {
                const vCaps = getVideoModelCapabilities(selectedModel);
                return vCaps.supportedDurations.map(dur => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => {
                      setVideoDuration?.(dur);
                      // Veo Pro 1080p/4K requires 8s duration
                      if (dur !== '8s' && (selectedModel === 'veo-pro' || selectedModel === 'veo-3.1-generate-preview') && videoResolution === '4k') {
                        setVideoResolution?.('720p');
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1.5 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                      (videoDuration || '8s') === dur
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                    title={`Generation duration: ${dur}`}
                  >
                    {dur}
                  </button>
                ));
              })()}
            </div>

            {/* Dynamic Model-Supported Resolution Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Resolution</span>
              {(() => {
                const vCaps = getVideoModelCapabilities(selectedModel);
                return vCaps.supportedResolutions.map(res => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => {
                      setVideoResolution?.(res);
                      // 1080p/4K on Veo Pro requires 8s duration
                      if ((res === '1080p' || res === '4k') && (selectedModel === 'veo-pro' || selectedModel === 'veo-3.1-generate-preview')) {
                        setVideoDuration?.('8s');
                      }
                    }}
                    className={cn(
                      "px-2.5 py-1.5 rounded-sm text-xs font-bold transition-all border cursor-pointer uppercase",
                      (videoResolution || (vCaps.supportedResolutions.includes('1080p') ? '1080p' : '720p')) === res
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 shadow-sm"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                    title={
                      res === '4k'
                        ? '4K Ultra-High Definition (Veo Pro requires 8s)'
                        : (res === '1080p' ? '1080p Full HD' : '720p Standard Definition')
                    }
                  >
                    {res}
                  </button>
                ));
              })()}
            </div>

          </>
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

        {selectedGem.type === 'audio' && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Switcher: Voiceover vs Music */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Mode</span>
              <button
                type="button"
                onClick={() => setAudioGenerationType?.('voiceover')}
                className={cn(
                  "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5",
                  audioGenerationType !== 'music'
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <Volume2 size={13} />
                <span>Voiceover (TTS)</span>
              </button>
              <button
                type="button"
                onClick={() => setAudioGenerationType?.('music')}
                className={cn(
                  "px-3 py-1.5 rounded-sm text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5",
                  audioGenerationType === 'music'
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <Music size={13} />
                <span>Music (Lyria 3.5)</span>
              </button>
            </div>

            {/* When Voiceover is active */}
            {audioGenerationType !== 'music' && (
              <>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Emotion</span>
                  {(['Professional', 'Cheerful', 'Energetic', 'Calming', 'Dramatic'] as const).map(emotion => (
                    <button
                      key={emotion}
                      type="button"
                      onClick={() => setVoiceEmotion(emotion)}
                      className={cn(
                        "px-2.5 py-1 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                        voiceEmotion === emotion
                          ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                          : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Speakers</span>
                  <button
                    type="button"
                    onClick={() => setSpeakerMode?.('single')}
                    className={cn(
                      "px-2.5 py-1 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                      speakerMode !== 'two-speaker'
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpeakerMode?.('two-speaker')}
                    className={cn(
                      "px-2.5 py-1 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                      speakerMode === 'two-speaker'
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    Two Speakers
                  </button>
                </div>
              </>
            )}

            {/* When Music is active */}
            {audioGenerationType === 'music' && (
              <>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Format</span>
                  <button
                    type="button"
                    onClick={() => setMusicMode?.('clip')}
                    className={cn(
                      "px-2.5 py-1 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                      musicMode !== 'full-track'
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                    title="Lyria 3.5 Clip (30s, 5 credits)"
                  >
                    30s Clip (5c)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMusicMode?.('full-track')}
                    className={cn(
                      "px-2.5 py-1 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                      musicMode === 'full-track'
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                    title="Lyria 3.5 Pro (Full track, 10 credits)"
                  >
                    Full Track (10c)
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-2 uppercase tracking-wider">Genre</span>
                  {(['Cinematic', 'Electronic', 'Lofi Beat', 'Acoustic', 'Corporate'] as const).map(genre => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => setMusicGenre?.(genre)}
                      className={cn(
                        "px-2.5 py-1 rounded-sm text-xs font-bold transition-all border cursor-pointer",
                        musicGenre === genre
                          ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60"
                          : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Model capabilities / possibilities display */}
      {(selectedGem.type === 'image' || selectedGem.type === 'video') && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 bg-slate-50/70 dark:bg-slate-900/30 rounded-sm border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 w-full select-none animate-in fade-in slide-in-from-top-1">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
            Model Capabilities
          </span>
          <span className="hidden sm:inline h-3.5 w-px bg-slate-200 dark:bg-slate-800" />
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            Active Model:
            {(() => {
              const norm = selectedModel.toLowerCase();
              const isGoogle = norm.includes('omni') || norm.includes('veo') || norm.includes('imagen') || norm.includes('gemini');
              const isFal = norm.includes('kling') || norm.includes('seedance') || norm.includes('flux');
              let capKey: any = null;
              if (norm.includes('omni')) capKey = 'model-omni';
              else if (norm === 'veo-pro' || norm === 'veo-3.1-generate-preview' || (norm.includes('veo') && !norm.includes('fast') && !norm.includes('lite'))) capKey = 'model-veo-pro';
              else if (norm.includes('veo') && norm.includes('fast')) capKey = 'model-veo-fast';
              else if (norm.includes('veo') && norm.includes('lite')) capKey = 'model-veo-lite';
              else if (norm.includes('kling')) capKey = 'model-kling';
              else if (norm.includes('seedance')) capKey = 'model-seedance';

              return (
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  {isGoogle && <ProviderBadge provider="google" />}
                  {isFal && <ProviderBadge provider="fal" />}
                  {capKey && <AppIcon name={capKey} size={14} strokeWidth={2} className="text-purple-500" />}
                  <span>
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
              );
            })()}
          </span>
          
          {selectedGem.type === 'image' ? (
            (() => {
              const caps = getImageModelCapabilities(selectedModel);
              return (
                <>
                  <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                  {renderCapabilityPill('Aspect Ratio', caps.aspectRatio)}
                  <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                  {renderCapabilityPill('Logo Overlay', caps.logoOverlay)}
                  <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                  {renderCapabilityPill('Face Reference', caps.faceReference)}
                  <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                  {renderCapabilityPill('Product Reference', caps.productReference)}
                  <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                  {renderCapabilityPill('Ingredients', caps.ingredients)}
                </>
              );
            })()
          ) : (
            (() => {
              const vCaps = getVideoModelCapabilities(selectedModel);
              const norm = selectedModel.toLowerCase();
              const isOmni = norm === 'google-omni' || norm.includes('omni');
              const isVeoPro = norm === 'veo-pro' || norm === 'veo-3.1-generate-preview' || (norm.includes('veo') && norm.includes('pro'));
              const isVeoFast = norm === 'veo-fast' || norm === 'veo-3.1-fast-generate-preview' || (norm.includes('veo') && norm.includes('fast'));
              const isVeoLite = norm === 'veo-lite' || norm === 'veo-3.1-lite-generate-preview' || (norm.includes('veo') && norm.includes('lite'));
              const isKling = norm.includes('kling');
              const isSeedance = norm.includes('seedance');

              // Generate tailored positive feature badges per model
              const badges: Array<{ label: string; value: string; color?: string }> = [];

              if (isOmni) {
                badges.push({ label: 'Continuity', value: 'Multi-Turn Video Editing', color: 'blue' });
                badges.push({ label: 'Image Conditioning', value: 'Inline Reference Parts (3 max)', color: 'emerald' });
                badges.push({ label: 'Audio Direction', value: '5 Acoustic Styles', color: 'purple' });
                badges.push({ label: 'Durations', value: '4s – 10s', color: 'sky' });
              } else if (isVeoPro) {
                badges.push({ label: 'Keyframes', value: 'Start + End Motion Interpolation', color: 'emerald' });
                badges.push({ label: 'Subject Consistency', value: '3 Reference Images', color: 'purple' });
                badges.push({ label: 'Cinematic Fidelity', value: 'Up to 4K Ultra-HD (8s)', color: 'rose' });
                badges.push({ label: 'Audio Direction', value: 'Supported', color: 'sky' });
              } else if (isVeoFast) {
                badges.push({ label: 'Image Animation', value: 'Start Frame Keyframe', color: 'emerald' });
                badges.push({ label: 'Operational Speed', value: 'Low Latency Rapid Generation', color: 'amber' });
                badges.push({ label: 'Durations', value: '5s, 7s', color: 'sky' });
              } else if (isVeoLite) {
                badges.push({ label: 'Draft Mode', value: '720p Fast Storyboarding', color: 'rose' });
                badges.push({ label: 'Cost Efficiency', value: '10 Credits (Lowest Cost)', color: 'emerald' });
                badges.push({ label: 'Input Mode', value: 'Direct Text-to-Video', color: 'sky' });
              } else if (isKling) {
                badges.push({ label: 'Keyframes', value: 'Start + End Keyframe Control', color: 'emerald' });
                badges.push({ label: 'Element Tokens', value: '@Element1..@Element4 Tags', color: 'rose' });
                badges.push({ label: 'Native Audio', value: 'Synchronized Lip-Sync & Sound', color: 'purple' });
                badges.push({ label: 'Aspect Ratios', value: '1:1 Square, 16:9, 9:16', color: 'sky' });
              } else if (isSeedance) {
                badges.push({ label: 'Reference Board', value: 'Up to 9 Semantic Images', color: 'purple' });
                badges.push({ label: 'Motion Guides', value: '3 Video Guides', color: 'blue' });
                badges.push({ label: 'Timing Tracks', value: '3 Audio Tracks', color: 'amber' });
                badges.push({ label: 'Native Audio', value: 'Synchronized Lip-Sync & Foley', color: 'emerald' });
                badges.push({ label: 'Multi-Shot', value: 'Supported', color: 'sky' });
              } else {
                if (vCaps.supportsFirstFrame) badges.push({ label: 'Start Keyframe', value: 'Native', color: 'emerald' });
                if (vCaps.supportsLastFrame) badges.push({ label: 'End Keyframe', value: 'Native', color: 'emerald' });
                if (vCaps.supportsReferences) badges.push({ label: 'References', value: `${vCaps.maxReferenceImages} max`, color: 'emerald' });
                if (vCaps.supportsAudio) badges.push({ label: 'Audio', value: 'Supported', color: 'purple' });
              }

              return (
                <>
                  {badges.map((b) => (
                    <React.Fragment key={b.label}>
                      <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                      <span className="flex items-center gap-1 text-slate-650 dark:text-slate-350">
                        {b.label}:
                        <span className={cn(
                          "font-bold text-[10px] px-1.5 py-0.5 rounded-xs tracking-tight shadow-xs border",
                          b.color === 'emerald' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                          b.color === 'rose' && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                          b.color === 'purple' && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                          b.color === 'blue' && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                          b.color === 'amber' && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                          (!b.color || b.color === 'sky') && "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                        )}>
                          {b.value}
                        </span>
                      </span>
                    </React.Fragment>
                  ))}
                </>
              );
            })()
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
        voiceEmotion={props.voiceEmotion}
        audioGenerationType={props.audioGenerationType}
        musicMode={props.musicMode}
        musicGenre={props.musicGenre}
        musicMood={props.musicMood}
        speakerMode={props.speakerMode}
        speakerTwoVoice={props.speakerTwoVoice}
        setSpeakerTwoVoice={props.setSpeakerTwoVoice}
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
        videoDuration={props.videoDuration}
        setVideoDuration={props.setVideoDuration}
        videoResolution={props.videoResolution}
        setVideoResolution={props.setVideoResolution}
        videoAudioIntent={props.videoAudioIntent}
        setVideoAudioIntent={props.setVideoAudioIntent}
        videoNativeAudio={props.videoNativeAudio}
        setVideoNativeAudio={props.setVideoNativeAudio}
        videoShotType={props.videoShotType}
        setVideoShotType={props.setVideoShotType}
        videoReferences={props.videoReferences}
        setVideoReferences={props.setVideoReferences}
        klingElements={props.klingElements}
        setKlingElements={props.setKlingElements}
        selectedModel={props.selectedModel}
        selectedPresentationTheme={props.selectedPresentationTheme}
        setSelectedPresentationTheme={props.setSelectedPresentationTheme}
        aspectRatio={props.aspectRatio}
        imageStyle={props.imageStyle}
        bakeLogoOnGeneration={props.bakeLogoOnGeneration}
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
