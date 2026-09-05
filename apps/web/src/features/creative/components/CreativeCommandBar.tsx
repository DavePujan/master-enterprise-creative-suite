import React from 'react';
import { 
  Globe, 
  Volume2, 
  Music,
  Sparkles, 
  Palette, 
  Image as ImageIcon, 
  X, 
  Upload, 
  Send, 
  Loader2,
  AlertCircle,
  Film,
  Check,
  Plus,
  Tag,
  Mic,
  RefreshCw,
  Info,
  Zap,
  Layers,
  Package,
  User
} from 'lucide-react';
import { AppIcon } from '@web/shared/components/icons/AppIconRegistry.js';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { useCreditGate } from '@web/features/billing/context/CreditGateContext.js';
import { generateFastPrompt } from '@web/infrastructure/ai/promptBuilders.js';
import { generateImageAutoWriteIdea } from '../services/imageAutoWriteService.js';
import { generateTextAutoWriteIdea } from '../services/textAutoWriteService.js';
import { generateAudioAutoWriteIdea } from '../services/audioStudioService.js';
import { VIDEO_MODELS, getImageModelCapabilities, getVideoModelCapabilities } from '@web/infrastructure/ai/modelRegistry.js';
import { videoClient } from '@web/features/video/services/videoClient.js';
import type { ImageAutoWriteIdea } from '@shared-types/imageAutoWrite.js';
import type { TextAutoWriteIdea, CaptionEmotion } from '@shared-types/textAutoWrite.js';
import type { AudioAutoWriteIdea } from '@shared-types/audioAutoWrite.js';
import { resizeImageIfNeeded } from '@utils/image.js';
import { cn } from '@web/lib/utils.js';

export interface CreativeCommandBarProps {
  selectedGem: Gem;
  brandGuidelines: BrandGuidelines;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
  voiceEmotion?: 'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming' | 'Dramatic';
  audioGenerationType?: 'voiceover' | 'music';
  musicMode?: 'clip' | 'full-track';
  musicGenre?: string;
  musicMood?: string;
  speakerMode?: 'single' | 'two-speaker';
  speakerTwoVoice?: string;
  setSpeakerTwoVoice?: (voice: string) => void;
  isGeneratingCreativePrompt: boolean;
  setIsGeneratingCreativePrompt: (val: boolean) => void;
  prompt: string;
  setPrompt: (val: string) => void;
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
  videoDuration?: string;
  setVideoDuration?: (duration: string) => void;
  videoResolution?: '720p' | '1080p' | '4k';
  setVideoResolution?: (res: '720p' | '1080p' | '4k') => void;
  videoAudioIntent?: 'none' | 'ambient' | 'music' | 'sfx' | 'cinematic_soundscape';
  setVideoAudioIntent?: (intent: 'none' | 'ambient' | 'music' | 'sfx' | 'cinematic_soundscape') => void;
  videoNativeAudio?: boolean;
  setVideoNativeAudio?: (val: boolean) => void;
  videoShotType?: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling';
  setVideoShotType?: (type: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling') => void;
  videoReferences?: Array<{ id: string; type: string; name: string; data: string; role?: string }>;
  setVideoReferences?: React.Dispatch<React.SetStateAction<Array<{ id: string; type: string; name: string; data: string; role?: string }>>>;
  klingElements?: Array<{ id: string; tag: string; name: string; data: string }>;
  setKlingElements?: React.Dispatch<React.SetStateAction<Array<{ id: string; tag: string; name: string; data: string }>>>;
  selectedModel: string;
  selectedPresentationTheme: any;
  setSelectedPresentationTheme: (theme: any) => void;
  aspectRatio?: string;
  imageStyle?: string;
  bakeLogoOnGeneration?: boolean;
  isGenerating: boolean;
  handleGenerate: () => Promise<void>;
}

export const CreativeCommandBar: React.FC<CreativeCommandBarProps> = ({
  selectedGem,
  brandGuidelines,
  selectedLanguage,
  setSelectedLanguage,
  selectedVoice,
  setSelectedVoice,
  voiceEmotion,
  isGeneratingCreativePrompt,
  setIsGeneratingCreativePrompt,
  prompt,
  setPrompt,
  productContext,
  setProductContext,
  faceContext,
  setFaceContext,
  firstFrameContext,
  setFirstFrameContext,
  lastFrameContext,
  setLastFrameContext,
  ingredientsContexts,
  setIngredientsContexts,
  videoDuration,
  setVideoDuration,
  videoResolution,
  setVideoResolution,
  videoAudioIntent: propVideoAudioIntent,
  setVideoAudioIntent: propSetVideoAudioIntent,
  videoNativeAudio: propVideoNativeAudio,
  setVideoNativeAudio: propSetVideoNativeAudio,
  videoShotType,
  setVideoShotType,
  videoReferences: propVideoReferences,
  setVideoReferences: propSetVideoReferences,
  klingElements: propKlingElements,
  setKlingElements: propSetKlingElements,
  selectedModel,
  selectedPresentationTheme,
  setSelectedPresentationTheme,
  aspectRatio,
  imageStyle,
  bakeLogoOnGeneration,
  audioGenerationType,
  musicMode,
  musicGenre,
  musicMood,
  speakerMode,
  speakerTwoVoice,
  setSpeakerTwoVoice,
  isGenerating,
  handleGenerate
}) => {
  const [activeIdeaPreview, setActiveIdeaPreview] = React.useState<ImageAutoWriteIdea | null>(null);
  const [activeTextIdeaPreview, setActiveTextIdeaPreview] = React.useState<TextAutoWriteIdea | null>(null);
  const [activeAudioIdeaPreview, setActiveAudioIdeaPreview] = React.useState<AudioAutoWriteIdea | null>(null);
  const [videoCreationMode, setVideoCreationMode] = React.useState<'text_to_video' | 'image_to_video' | 'multi_shot' | 'reference_to_video'>('text_to_video');

  const [localVideoAudioIntent, setLocalVideoAudioIntent] = React.useState<'none' | 'ambient' | 'music' | 'sfx' | 'cinematic_soundscape'>('ambient');
  const activeVideoAudioIntent = propVideoAudioIntent || localVideoAudioIntent;
  const setActiveVideoAudioIntent = (val: 'none' | 'ambient' | 'music' | 'sfx' | 'cinematic_soundscape') => {
    if (propSetVideoAudioIntent) propSetVideoAudioIntent(val);
    setLocalVideoAudioIntent(val);
  };

  const [localVideoNativeAudio, setLocalVideoNativeAudio] = React.useState<boolean>(true);
  const activeVideoNativeAudio = propVideoNativeAudio !== undefined ? propVideoNativeAudio : localVideoNativeAudio;
  const setActiveVideoNativeAudio = (val: boolean) => {
    if (propSetVideoNativeAudio) propSetVideoNativeAudio(val);
    setLocalVideoNativeAudio(val);
  };

  const [localVideoReferences, setLocalVideoReferences] = React.useState<Array<{ id: string; type: string; name: string; data: string; role?: string }>>([]);
  const activeVideoReferences = propVideoReferences || localVideoReferences;
  const setActiveVideoReferences = propSetVideoReferences || setLocalVideoReferences;

  const [localKlingElements, setLocalKlingElements] = React.useState<Array<{ id: string; tag: string; name: string; data: string }>>([]);
  const activeKlingElements = propKlingElements || localKlingElements;
  const setActiveKlingElements = propSetKlingElements || setLocalKlingElements;

  // Auto-reconcile video creation mode when model changes
  React.useEffect(() => {
    if (selectedGem.type === 'video') {
      const vCaps = getVideoModelCapabilities(selectedModel);
      if (!vCaps.supportedModes.includes(videoCreationMode)) {
        setVideoCreationMode((vCaps.supportedModes[0] as any) || 'text_to_video');
      }
    }
  }, [selectedModel, selectedGem.type]);

  const { credits, openCreditGate } = useCreditGate();

  const videoRecommendation = React.useMemo(() => {
    if (firstFrameContext && lastFrameContext) {
      return {
        name: 'Google Veo 3.1 Pro',
        reason: 'Required for start-to-end frame interpolation.'
      };
    }
    if (activeVideoReferences.length > 2 || ingredientsContexts.length > 2 || videoCreationMode === 'reference_to_video') {
      return {
        name: 'Seedance 2.0 Cinematic',
        reason: 'Optimal for rich multimodal reference board & choreography.'
      };
    }
    if (aspectRatio === '1:1') {
      return {
        name: 'Kling 3.0 Standard',
        reason: 'Native support for 1:1 square social format.'
      };
    }
    return {
      name: 'Google Omni 1.1 Flash',
      reason: 'Best for multimodal generation, synchronized audio & conversational editing.'
    };
  }, [firstFrameContext, lastFrameContext, activeVideoReferences.length, ingredientsContexts.length, videoCreationMode, aspectRatio]);

  const estimatedCost = React.useMemo(() => {
    if (selectedGem.type === 'image') {
      return selectedModel === 'fal-ai/flux-pro/v1.1' ? 4 : (selectedModel === 'fal-ai/fast-sdxl' ? 2 : 3);
    }
    if (selectedGem.type === 'video') {
      const vCaps = getVideoModelCapabilities(selectedModel);
      return vCaps.creditCost;
    }
    if (selectedGem.type === 'audio') {
      return audioGenerationType === 'music' ? (musicMode === 'full-track' ? 10 : 3) : 2;
    }
    if (selectedGem.type === 'text') {
      return 1;
    }
    if (selectedGem.id === 'corporate-presentations' || selectedGem.type === 'slideshow') {
      return 10;
    }
    return selectedGem.cost || 5;
  }, [selectedGem, selectedModel, audioGenerationType, musicMode]);

  const generateCustomThemes = (guidelines: any) => {
    const brandColors = guidelines?.colors && guidelines.colors.length > 0 ? guidelines.colors : ['#0f172a', '#334155'];
    const pColor = brandColors[0] || '#0f172a';
    const sColor = brandColors[1] || brandColors[0] || '#334155';
    const brandName = guidelines?.name || 'Brand';
    const primaryFont = guidelines?.typography?.primary || 'sans';
    const secondaryFont = guidelines?.typography?.secondary || 'sans';
    
    return [
      {
        id: 'signature-brand',
        name: `Signature ${brandName}`,
        description: 'A deep corporate immersive look centering your brand colors.',
        bg: pColor,
        text: '#ffffff',
        accent: sColor,
        secondary: '#94a3b8',
        font: primaryFont,
        overlay: 0.2,
        cardBg: 'rgba(15, 23, 42, 0.45)',
        border: 'rgba(255, 255, 255, 0.1)',
        lineStyle: `linear-gradient(90deg, ${pColor}, ${sColor})`
      },
      {
        id: 'executive-crisp',
        name: 'Executive Crisp',
        description: 'A light, high-contrast and data-oriented elite minimalist theme.',
        bg: '#fafafa',
        text: '#0f172a',
        accent: pColor,
        secondary: '#475569',
        font: secondaryFont,
        overlay: 0.95,
        cardBg: '#ffffff',
        border: 'rgba(15, 23, 42, 0.08)',
        lineStyle: `linear-gradient(90deg, ${pColor}, #cbd5e1)`
      },
      {
        id: 'midnight-tech',
        name: 'Midnight Tech',
        description: 'A premium, ultra-modern slate-black technical dashboard theme.',
        bg: '#020617',
        text: '#f8fafc',
        accent: sColor,
        secondary: '#64748b',
        font: 'mono',
        overlay: 0.15,
        cardBg: '#0f172a',
        border: 'rgba(255, 255, 255, 0.08)',
        lineStyle: `linear-gradient(90deg, ${sColor}, #38bdf8)`
      }
    ];
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-sm border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-widest">Command Input</label>
          {(selectedGem.id === 'brand-copy' || (selectedGem.type === 'audio' && audioGenerationType !== 'music')) && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-sm border border-slate-200 dark:border-slate-700">
                <Globe size={12} className="text-slate-500" />
                <select 
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Marathi">Marathi</option>
                  <option value="Gujarati">Gujarati</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-sm border border-slate-200 dark:border-slate-700">
                <Volume2 size={12} className="text-slate-500" />
                {speakerMode === 'two-speaker' && (
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Speaker 1:</span>
                )}
                <select 
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                >
                  <option value="Kore">Kore (Female - Warm)</option>
                  <option value="Puck">Puck (Male - Dynamic)</option>
                  <option value="Charon">Charon (Male - Deep)</option>
                  <option value="Fenrir">Fenrir (Male - Resonant)</option>
                  <option value="Zephyr">Zephyr (Female - Calm)</option>
                  <option value="Aoede">Aoede (Female - Expressive)</option>
                  <option value="Callirrhoe">Callirrhoe (Female - Commercial)</option>
                  <option value="Enceladus">Enceladus (Male - Cinematic)</option>
                  <option value="Iapetus">Iapetus (Male - Executive)</option>
                  <option value="Achird">Achird (Female - Professional)</option>
                  <option value="Despina">Despina (Female - Energetic)</option>
                  <option value="Rasalgethi">Rasalgethi (Male - Storyteller)</option>
                </select>
              </div>
              {speakerMode === 'two-speaker' && (
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-sm border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-left-2">
                  <Volume2 size={12} className="text-rose-500" />
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Speaker 2:</span>
                  <select 
                    value={speakerTwoVoice || 'Puck'}
                    onChange={(e) => setSpeakerTwoVoice?.(e.target.value)}
                    className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                  >
                    <option value="Puck">Puck (Male - Dynamic)</option>
                    <option value="Kore">Kore (Female - Warm)</option>
                    <option value="Charon">Charon (Male - Deep)</option>
                    <option value="Fenrir">Fenrir (Male - Resonant)</option>
                    <option value="Zephyr">Zephyr (Female - Calm)</option>
                    <option value="Aoede">Aoede (Female - Expressive)</option>
                    <option value="Callirrhoe">Callirrhoe (Female - Commercial)</option>
                    <option value="Enceladus">Enceladus (Male - Cinematic)</option>
                    <option value="Iapetus">Iapetus (Male - Executive)</option>
                    <option value="Achird">Achird (Female - Professional)</option>
                    <option value="Despina">Despina (Female - Energetic)</option>
                    <option value="Rasalgethi">Rasalgethi (Male - Storyteller)</option>
                  </select>
                </div>
              )}
            </div>
          )}
          {selectedGem.type === 'audio' && audioGenerationType === 'music' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Lyria Engine: {musicMode === 'full-track' ? 'Pro (Full Track)' : 'Clip (30s)'}
              </span>
              <span className="text-[10px] text-slate-400">· Genre: {musicGenre || 'Cinematic'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                setIsGeneratingCreativePrompt(true);
                if (selectedGem.type === 'image') {
                  const caps = getImageModelCapabilities(selectedModel);
                  const res = await generateImageAutoWriteIdea({
                    userIntent: prompt,
                    brandGuidelines,
                    imageConfig: {
                      aspectRatio: aspectRatio || '1:1',
                      selectedModel,
                      style: imageStyle,
                      bakeLogoOnGeneration: !!bakeLogoOnGeneration,
                      hasProductContext: !!productContext,
                      productName: productContext?.name,
                      hasFaceContext: !!faceContext,
                      faceName: faceContext?.name,
                      ingredients: ingredientsContexts.map(i => i.name)
                    },
                    capabilities: caps
                  });
                  setPrompt(res.idea.prompt);
                  setActiveIdeaPreview(res.idea);
                } else if (selectedGem.type === 'text') {
                  const res = await generateTextAutoWriteIdea({
                    userIntent: prompt,
                    brandContext: {
                      name: brandGuidelines.name,
                      industry: brandGuidelines.industry,
                      tone: brandGuidelines.tone,
                      pillars: brandGuidelines.pillars,
                      colors: brandGuidelines.colors,
                      location: brandGuidelines.location,
                      targetAudience: (brandGuidelines as any).targetAudience || brandGuidelines.mission,
                    },
                    emotion: (voiceEmotion as CaptionEmotion) || 'Neutral',
                    quality: selectedModel === 'gemini-2.5-pro' ? 'premium' : 'standard',
                    productContext: productContext ? {
                      id: productContext.id,
                      name: productContext.name,
                      details: productContext.data ? 'Product photo attached' : undefined
                    } : undefined,
                    targetLanguage: selectedLanguage,
                    platforms: ['Instagram', 'LinkedIn', 'X', 'Threads']
                  });
                  setPrompt(res.idea.formattedCopy);
                  setActiveTextIdeaPreview(res.idea);
                } else if (selectedGem.type === 'audio') {
                  const res = await generateAudioAutoWriteIdea({
                    userIntent: prompt,
                    brandContext: {
                      name: brandGuidelines.name,
                      industry: brandGuidelines.industry,
                      tone: brandGuidelines.tone,
                      pillars: brandGuidelines.pillars,
                      colors: brandGuidelines.colors,
                      location: brandGuidelines.location,
                      targetAudience: (brandGuidelines as any).targetAudience || brandGuidelines.mission,
                    },
                    activeMode: audioGenerationType || 'voiceover',
                    targetLanguage: selectedLanguage,
                  });
                  if (audioGenerationType === 'music') {
                    setPrompt(res.idea.musicDirection.musicalBrief);
                  } else {
                    setPrompt(res.idea.voiceoverScript);
                  }
                  setActiveAudioIdeaPreview(res.idea);
                } else if (selectedGem.type === 'video') {
                  const res = await videoClient.generatePlan({
                    topic: prompt || brandGuidelines.mission || `${brandGuidelines.name} Showcase`,
                    creativeTone: brandGuidelines.tone,
                    productName: productContext?.name,
                    targetAudience: (brandGuidelines as any).targetAudience || brandGuidelines.mission
                  });
                  const planPrompt = res?.plan?.cinematicPrompt || (res?.plan as any)?.prompt;
                  if (planPrompt) {
                    setPrompt(planPrompt);
                  }
                } else {
                  const prm = await generateFastPrompt(
                    'creative', 
                    brandGuidelines.name, 
                    selectedGem.name, 
                    selectedGem.id, 
                    !!productContext, 
                    !!faceContext,
                    brandGuidelines
                  );
                  setPrompt(prm);
                }
              } catch (e) {
                console.error(e);
              } finally {
                setIsGeneratingCreativePrompt(false);
              }
            }}
            disabled={isGeneratingCreativePrompt}
            className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-amber-400 flex items-center gap-1.5 transition-all font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 px-2 py-0.5 rounded-sm hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 animate-pulse-once"
            title="Generate structured brand-aligned image prompt with AI Commercial Art Director"
            type="button"
          >
            {isGeneratingCreativePrompt ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            Auto-Write
          </button>
          <span className="text-[10px] text-slate-400">Powered by Enterprise Creative Intelligence</span>
        </div>
      </div>

      {selectedGem.id === 'corporate-presentations' && (
        <div className="space-y-3 pb-3 pt-1 border-b border-slate-100 dark:border-slate-800/80 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Palette size={12} className="text-rose-500" />
              Custom Brand Presentation Themes
            </span>
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
              Generated from Active Brand Guidelines
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {generateCustomThemes(brandGuidelines).map((theme) => {
              const isSelected = selectedPresentationTheme?.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedPresentationTheme(theme)}
                  className={cn(
                    "flex flex-col text-left p-3.5 rounded-sm border transition-all cursor-pointer relative overflow-hidden group",
                    isSelected
                      ? "border-rose-500 dark:border-rose-400 bg-white dark:bg-slate-900 shadow-md ring-2 ring-rose-500/20"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div 
                    className="absolute top-0 left-0 right-0 h-0.75" 
                    style={{ background: theme.lineStyle }}
                  />

                  
                  <div className="flex items-center justify-between w-full mt-1.5">
                    <span className={cn(
                      "text-xs font-bold",
                      isSelected ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"
                    )}>
                      {theme.name}
                    </span>
                    <div 
                      className="w-3.5 h-3.5 rounded-full border flex items-center justify-center border-slate-300 dark:border-slate-600"
                      style={{ backgroundColor: theme.bg }}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed flex-1">
                    {theme.description}
                  </p>
                  
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-mono">
                      Font: {theme.font}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                      Overlay: {theme.overlay * 100}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedGem.type === 'video' && (() => {
        const vCaps = getVideoModelCapabilities(selectedModel);
        const norm = selectedModel.toLowerCase();
        const isOmni = norm === 'google-omni' || norm.includes('omni');
        const isVeoPro = norm === 'veo-pro' || norm === 'veo-3.1-generate-preview' || (norm.includes('veo') && norm.includes('pro'));
        const isVeoFast = norm === 'veo-fast' || norm === 'veo-3.1-fast-generate-preview' || (norm.includes('veo') && norm.includes('fast'));
        const isVeoLite = norm === 'veo-lite' || norm === 'veo-3.1-lite-generate-preview' || (norm.includes('veo') && norm.includes('lite'));
        const isKling = norm.includes('kling');
        const isSeedance = norm.includes('seedance');

        const modeLabels: Record<string, string> = {
          text_to_video: 'Text to Video',
          image_to_video: 'Animate Image',
          edit_video: 'Conversational Edit',
          extend_video: 'Extend Video',
          multi_shot: 'Multi-Shot Sequence',
          reference_to_video: 'Reference Board'
        };

        const imageRefs = activeVideoReferences.filter(r => r.type === 'image');
        const videoRefs = activeVideoReferences.filter(r => r.type === 'video');
        const audioRefs = activeVideoReferences.filter(r => r.type === 'audio');

        return (
          <div className="space-y-4 pb-2 pt-1 animate-in fade-in duration-200">
            {/* Creation Mode, Credit Badge & Audio Intent Header */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Creation Mode:
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {vCaps.supportedModes.map(modeId => (
                      <button
                        key={modeId}
                        type="button"
                        onClick={() => setVideoCreationMode(modeId as any)}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-xs transition-colors cursor-pointer border",
                          videoCreationMode === modeId
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-xs"
                            : "border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {modeLabels[modeId] || modeId}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {vCaps.creditCost} Credits
                  </span>
                  <span className="px-2 py-0.5 rounded-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider font-mono">
                    {(() => {
                      const m = VIDEO_MODELS.find(x => x.id === selectedModel);
                      return m ? (m.modelName || m.name) : selectedModel;
                    })()}
                  </span>
                </div>
              </div>

              {/* Audio Intent & Native Audio Toggle */}
              {vCaps.supportsAudio && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <Volume2 size={12} className="text-purple-500" />
                      Audio Intent:
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { id: 'none', label: 'Mute / Silent', iconKey: 'audio-mute' as const },
                        { id: 'ambient', label: 'Ambient', iconKey: 'audio-ambient' as const },
                        { id: 'music', label: 'Score', iconKey: 'audio-score' as const },
                        { id: 'sfx', label: 'Action SFX', iconKey: 'audio-sfx' as const },
                        { id: 'cinematic_soundscape', label: 'Full Soundscape', iconKey: 'audio-soundscape' as const }
                      ].map(intent => (
                        <button
                          key={intent.id}
                          type="button"
                          onClick={() => setActiveVideoAudioIntent(intent.id as any)}
                          className={cn(
                            "px-2 py-0.5 text-[9px] font-bold rounded-xs transition-colors cursor-pointer border flex items-center gap-1",
                            activeVideoAudioIntent === intent.id
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                              : "border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <AppIcon name={intent.iconKey} size={11} strokeWidth={2} />
                          <span>{intent.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(isKling || isSeedance) && (
                    <button
                      type="button"
                      onClick={() => setActiveVideoNativeAudio(!activeVideoNativeAudio)}
                      className={cn(
                        "px-2 py-0.5 text-[9px] font-bold rounded-xs transition-colors cursor-pointer border flex items-center gap-1",
                        activeVideoNativeAudio
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "border-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <Mic size={10} />
                      <span>{activeVideoNativeAudio ? 'Native Audio: Active' : 'Native Audio: Off'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 1. GOOGLE OMNI MODEL PANEL */}
            {isOmni && (
              <div className="space-y-3">
                <div className="p-3 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-transparent border border-blue-500/20 rounded-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                        <AppIcon name="model-omni" size={13} strokeWidth={2} className="text-blue-500" />
                        <span>Gemini Omni 1.1 Flash Engine</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        Chat directly with AI to modify and extend your video. You can easily adjust camera angles, tweak scenes, extend video up to 10 seconds, or add reference photos for visual guidance.
                      </p>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[9px] font-bold uppercase tracking-wider">
                      Conversational
                    </span>
                  </div>
                </div>

                {/* Multimodal Conditioning Reference Images (up to 3) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      Multimodal Conditioning References ({imageRefs.length}/3)
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Inline Reference Parts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {imageRefs.map((ref, idx) => (
                      <div key={ref.id} className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={ref.data} 
                          alt={`Reference ${idx + 1}`} 
                          className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{ref.name}</p>
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                            Ref Part {idx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveVideoReferences(prev => prev.filter(r => r.id !== ref.id))}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove Reference"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {imageRefs.length < 3 && (
                      <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>Attach Reference Image</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                setActiveVideoReferences(prev => [
                                  ...prev,
                                  {
                                    id: `omni-ref-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                    type: 'image',
                                    name: file.name,
                                    data: resized,
                                    role: 'reference_part'
                                  }
                                ]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. GOOGLE VEO PRO MODEL PANEL */}
            {isVeoPro && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* First Frame Box */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AppIcon name="frame-start" size={12} strokeWidth={2} className="text-blue-500" />
                      First Frame Image (Start Keyframe)
                    </span>
                    {firstFrameContext ? (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={firstFrameContext.data} 
                          alt="First Frame Context" 
                          className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{firstFrameContext.name}</p>
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                            Start Keyframe (Active)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFirstFrameContext(null)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove First Frame"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>Attach First Frame photo</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                setFirstFrameContext({
                                  id: 'first-frame-context-' + Date.now(),
                                  name: file.name,
                                  data: resized
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Last Frame Box */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AppIcon name="frame-end" size={12} strokeWidth={2} className="text-violet-500" />
                      Last Frame Image (End Keyframe)
                    </span>
                    {lastFrameContext ? (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={lastFrameContext.data} 
                          alt="Last Frame Context" 
                          className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{lastFrameContext.name}</p>
                          <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider">
                            End Keyframe (Active)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLastFrameContext(null)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove Last Frame"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-205 transition-colors">
                          <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>Attach Last Frame photo</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                setLastFrameContext({
                                  id: 'last-frame-context-' + Date.now(),
                                  name: file.name,
                                  data: resized
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {firstFrameContext && lastFrameContext && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xs text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    <Check size={13} className="text-emerald-500 shrink-0" />
                    <span>↔ Smooth Motion Interpolation Active: Veo Pro generates seamless transition physics between start and end keyframes.</span>
                  </div>
                )}

                {/* Veo Pro Reference Images (up to 3) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      Subject Consistency References ({imageRefs.length}/3)
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      Veo 3.1 Pro Multi-Reference
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {imageRefs.map((ref, idx) => (
                      <div key={ref.id} className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={ref.data} 
                          alt={`Subject ${idx + 1}`} 
                          className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{ref.name}</p>
                          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                            Subject Ref {idx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveVideoReferences(prev => prev.filter(r => r.id !== ref.id))}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove Reference"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {imageRefs.length < 3 && (
                      <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>Attach Subject Reference</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                setActiveVideoReferences(prev => [
                                  ...prev,
                                  {
                                    id: `veo-ref-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                    type: 'image',
                                    name: file.name,
                                    data: resized,
                                    role: 'subject'
                                  }
                                ]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {(videoResolution === '1080p' || videoResolution === '4k') && (
                  <div className="text-[10px] text-slate-400 italic flex items-center gap-1.5">
                    <Info size={12} className="shrink-0" />
                    <span>Note: 1080p and 4K output generation requires 8-second cinematic sequence duration.</span>
                  </div>
                )}
              </div>
            )}

            {/* 3. GOOGLE VEO FAST MODEL PANEL */}
            {isVeoFast && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AppIcon name="frame-start" size={12} strokeWidth={2} className="text-blue-500" />
                    Start Frame Photo (Animate Image)
                  </span>
                  {firstFrameContext ? (
                    <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                      <img 
                        src={firstFrameContext.data} 
                        alt="First Frame Context" 
                        className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{firstFrameContext.name}</p>
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                          Animation Source (Active)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFirstFrameContext(null)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                        title="Remove First Frame"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                        <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                        <span>Attach photo to animate with Veo Fast</span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const resized = await resizeImageIfNeeded(reader.result as string);
                              setFirstFrameContext({
                                id: 'first-frame-context-' + Date.now(),
                                name: file.name,
                                data: resized
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xs text-[11px] text-slate-600 dark:text-slate-300">
                  <Zap size={12} className="text-amber-500 shrink-0" />
                  <span>Rapid Generation Engine (5s / 7s) • End frame interpolation and subject references are disabled for ultra-low latency rendering.</span>
                </div>
              </div>
            )}

            {/* 4. GOOGLE VEO LITE MODEL PANEL */}
            {isVeoLite && (
              <div className="p-3 bg-slate-100/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <AppIcon name="model-veo-lite" size={13} strokeWidth={2} className="text-emerald-500" />
                    Veo Lite Preview Engine (Draft Mode)
                  </span>
                  <span className="px-2 py-0.5 rounded-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                    10 Credits • 720p • 5s
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Direct text-to-video generation optimized for rapid creative storyboarding and drafts. Media inputs and frame interpolation are disabled for maximum speed and cost efficiency.
                </p>
              </div>
            )}

            {/* 5. KLING 3.0 MODEL PANEL */}
            {isKling && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* First Frame Box */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AppIcon name="frame-start" size={12} strokeWidth={2} className="text-blue-500" />
                      Start Keyframe Image
                    </span>
                    {firstFrameContext ? (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={firstFrameContext.data} 
                          alt="Start Frame" 
                          className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{firstFrameContext.name}</p>
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                            Start Keyframe
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFirstFrameContext(null)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove Keyframe"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>Attach Start Keyframe</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                setFirstFrameContext({
                                  id: 'first-frame-context-' + Date.now(),
                                  name: file.name,
                                  data: resized
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Last Frame Box */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AppIcon name="frame-end" size={12} strokeWidth={2} className="text-violet-500" />
                      End Keyframe Image
                    </span>
                    {lastFrameContext ? (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={lastFrameContext.data} 
                          alt="End Frame" 
                          className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{lastFrameContext.name}</p>
                          <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider">
                            End Keyframe
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLastFrameContext(null)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove Keyframe"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-205 transition-colors">
                          <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>Attach End Keyframe</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                setLastFrameContext({
                                  id: 'last-frame-context-' + Date.now(),
                                  name: file.name,
                                  data: resized
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Kling Elements Injection Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AppIcon name="element-tag" size={12} strokeWidth={2} className="text-rose-500" />
                      Kling Elements Injection ({activeKlingElements.length}/4)
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Click a tag to insert into prompt
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    {activeKlingElements.map((el) => (
                      <div key={el.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={el.data} 
                          alt={el.tag} 
                          className="w-8 h-8 object-cover rounded-xs border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (!prompt.includes(el.tag)) {
                                setPrompt(prompt.trim() ? `${prompt.trim()} with ${el.tag}` : el.tag);
                              }
                            }}
                            className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                            title="Insert into prompt"
                          >
                            <span>{el.tag}</span>
                            <Plus size={10} />
                          </button>
                          <p className="text-[9px] text-slate-400 truncate">{el.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveKlingElements(prev => prev.filter(item => item.id !== el.id))}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove Element"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {activeKlingElements.length < 4 && (
                      <label className="flex flex-col items-center justify-center h-12 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          <Plus size={12} />
                          <span>Add @Element{activeKlingElements.length + 1}</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                const tag = `@Element${activeKlingElements.length + 1}`;
                                setActiveKlingElements(prev => [
                                  ...prev,
                                  {
                                    id: `kling-el-${Date.now()}`,
                                    tag,
                                    name: file.name,
                                    data: resized
                                  }
                                ]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. SEEDANCE 2.0 MODEL PANEL */}
            {isSeedance && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AppIcon name="model-seedance" size={12} strokeWidth={2} className="text-purple-500" />
                      Seedance Reference Board (Images: {imageRefs.length}/9, Videos: {videoRefs.length}/3, Audios: {audioRefs.length}/3)
                    </span>
                    <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider bg-purple-500/10 px-1.5 py-0.5 rounded-xs">
                      Universal Conditioning
                    </span>
                  </div>

                  {/* Image References Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {imageRefs.map((ref) => (
                      <div key={ref.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                        <img 
                          src={ref.data} 
                          alt={ref.name} 
                          className="w-10 h-10 object-cover rounded-xs border border-slate-200 dark:border-slate-600 bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{ref.name}</p>
                          <select
                            value={ref.role || 'subject'}
                            onChange={(e) => {
                              const newRole = e.target.value;
                              setActiveVideoReferences(prev => prev.map(item => item.id === ref.id ? { ...item, role: newRole } : item));
                            }}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] font-bold uppercase tracking-wider rounded-xs px-1.5 py-0.5 border border-slate-200 dark:border-slate-600 focus:outline-none cursor-pointer"
                          >
                            <option value="subject">Subject</option>
                            <option value="style">Style</option>
                            <option value="layout">Layout</option>
                            <option value="background">Background</option>
                            <option value="character">Character</option>
                            <option value="motion">Motion</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveVideoReferences(prev => prev.filter(item => item.id !== ref.id))}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                          title="Remove Reference"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {imageRefs.length < 9 && (
                      <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                          <Plus size={14} />
                          <span>Add Image Ref ({imageRefs.length}/9)</span>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const resized = await resizeImageIfNeeded(reader.result as string);
                                setActiveVideoReferences(prev => [
                                  ...prev,
                                  {
                                    id: `seedance-img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                    type: 'image',
                                    name: file.name,
                                    data: resized,
                                    role: 'subject'
                                  }
                                ]);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Video & Audio Guide Uploaders for Seedance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  {/* Video Guides */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <AppIcon name="video-guide" size={11} strokeWidth={2} className="text-blue-500" />
                      Motion/Video Guides ({videoRefs.length}/3)
                    </span>
                    <div className="space-y-1">
                      {videoRefs.map(v => (
                        <div key={v.id} className="flex items-center justify-between text-xs px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xs">
                          <span className="truncate max-w-[180px] font-medium">{v.name}</span>
                          <button
                            type="button"
                            onClick={() => setActiveVideoReferences(prev => prev.filter(item => item.id !== v.id))}
                            className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {videoRefs.length < 3 && (
                        <label className="flex items-center justify-center gap-1.5 h-8 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xs cursor-pointer text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                          <Plus size={11} />
                          <span>Attach Video Guide</span>
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setActiveVideoReferences(prev => [
                                    ...prev,
                                    {
                                      id: `seedance-vid-${Date.now()}`,
                                      type: 'video',
                                      name: file.name,
                                      data: reader.result as string,
                                      role: 'motion'
                                    }
                                  ]);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Audio Guides */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <AppIcon name="audio-guide" size={11} strokeWidth={2} className="text-purple-500" />
                      Audio Timing Tracks ({audioRefs.length}/3)
                    </span>
                    <div className="space-y-1">
                      {audioRefs.map(a => (
                        <div key={a.id} className="flex items-center justify-between text-xs px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xs">
                          <span className="truncate max-w-[180px] font-medium">{a.name}</span>
                          <button
                            type="button"
                            onClick={() => setActiveVideoReferences(prev => prev.filter(item => item.id !== a.id))}
                            className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {audioRefs.length < 3 && (
                        <label className="flex items-center justify-center gap-1.5 h-8 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xs cursor-pointer text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                          <Plus size={11} />
                          <span>Attach Audio Track</span>
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setActiveVideoReferences(prev => [
                                    ...prev,
                                    {
                                      id: `seedance-aud-${Date.now()}`,
                                      type: 'audio',
                                      name: file.name,
                                      data: reader.result as string,
                                      role: 'audio_guide'
                                    }
                                  ]);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {selectedGem.type === 'image' && (
        <div className="space-y-4 pb-2 pt-1">
          <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={12} className="text-slate-400" />
                Ingredients Reference Images ({ingredientsContexts.length}/3)
              </span>
              <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider bg-purple-500/10 px-1.5 py-0.5 rounded-xs">
                Prompt Guided Elements
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ingredientsContexts.map((ing, idx) => (
                <div key={ing.id} className="flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                  <img 
                    src={ing.data} 
                    alt={`Ingredient Context ${idx + 1}`} 
                    className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{ing.name}</p>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider">
                      Ingredient ref {idx + 1}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIngredientsContexts(prev => prev.filter(item => item.id !== ing.id))}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                    title="Remove Ingredient"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {ingredientsContexts.length < 3 && (
                <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                    <span>Add ingredient image</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const resized = await resizeImageIfNeeded(reader.result as string);
                          setIngredientsContexts(prev => [
                            ...prev,
                            {
                              id: 'ing-context-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                              name: file.name,
                              data: resized
                            }
                          ].slice(0, 3));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedGem.type === 'image' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 pt-1">
          {/* Product Context Image Box */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Package size={12} className="text-slate-400" />
              Product Context Image
            </span>
            {productContext ? (
              <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                <img 
                  src={productContext.data} 
                  alt="Product Context" 
                  className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{productContext.name}</p>
                  {selectedModel === 'openai/gpt-image-2' ? (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                      Active Product Reference (Plus Model)
                    </span>
                  ) : selectedModel === 'gemini-2.5-flash-image' ? (
                    <span className="text-[9px] text-amber-500 dark:text-amber-400 font-bold uppercase tracking-wider">
                      Product Reference (Inspirational Only)
                    </span>
                  ) : (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                      Active Product Reference
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setProductContext(null)}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                  title="Remove Product"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                  <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                  <span>Attach Product Photo</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const resized = await resizeImageIfNeeded(reader.result as string);
                        setProductContext({
                          id: 'product-context-' + Date.now(),
                          name: file.name,
                          data: resized
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Face / Model Context Image Box */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} className="text-slate-400" />
              Face / Model Context Image
            </span>
            {faceContext ? (
              <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-sm relative group overflow-hidden">
                <img 
                  src={faceContext.data} 
                  alt="Face Context" 
                  className="w-10 h-10 object-cover rounded-sm border border-slate-200 dark:border-slate-600 bg-white"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{faceContext.name}</p>
                  {selectedModel === 'openai/gpt-image-2' ? (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                      Active Face Reference (Plus Model)
                    </span>
                  ) : !selectedModel.includes('gemini-3') ? (
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                      Reference Ignored by Active Model
                    </span>
                  ) : (
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                      Active Character Reference (Consistent)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setFaceContext(null)}
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm transition-colors cursor-pointer"
                  title="Remove Face/Model"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-14 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-sm cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/40 group">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                  <Upload size={14} className="text-slate-400 dark:text-slate-500" />
                  <span>Attach Face/Model Photo</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const resized = await resizeImageIfNeeded(reader.result as string);
                        setFaceContext({
                          id: 'face-context-' + Date.now(),
                          name: file.name,
                          data: resized
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
      )}

      {activeIdeaPreview && selectedGem.type === 'image' && (
        <div className="flex items-start justify-between gap-3 p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-sm text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[11px] text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="animate-pulse" />
                {activeIdeaPreview.title}
              </span>
              <span className="text-[10px] text-slate-400">· Creative Concept</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {activeIdeaPreview.concept}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-1.5 border-t border-amber-500/10 text-[10px] text-slate-400 dark:text-slate-500">
              <span>Framing: <strong className="text-slate-700 dark:text-slate-300 font-medium">{activeIdeaPreview.visualDirection.composition}</strong></span>
              <span>·</span>
              <span>Lighting: <strong className="text-slate-700 dark:text-slate-300 font-medium">{activeIdeaPreview.visualDirection.lighting}</strong></span>
              <span>·</span>
              <span>Mood: <strong className="text-slate-700 dark:text-slate-300 font-medium">{activeIdeaPreview.visualDirection.mood}</strong></span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveIdeaPreview(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer transition-colors"
            title="Dismiss Creative Concept"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {activeTextIdeaPreview && selectedGem.type === 'text' && (
        <div className="flex items-start justify-between gap-3 p-3 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-sm text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-[11px] text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="animate-pulse" />
                {activeTextIdeaPreview.concept.angle}
              </span>
              <span className="text-[10px] text-slate-400">· Strategic Angle</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-[9px] uppercase tracking-wider">
                {activeTextIdeaPreview.concept.emotionalTone}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-medium">
              {activeTextIdeaPreview.concept.coreMessage}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-1.5 border-t border-rose-500/10 text-[10px] text-slate-400 dark:text-slate-500">
              <span>Audience: <strong className="text-slate-700 dark:text-slate-300 font-medium">{activeTextIdeaPreview.concept.targetAudience}</strong></span>
              <span>·</span>
              <span>Core Benefit: <strong className="text-slate-700 dark:text-slate-300 font-medium">{activeTextIdeaPreview.concept.keyBenefit}</strong></span>
              <span>·</span>
              <span className="flex items-center gap-1 flex-wrap">
                Platforms:
                {activeTextIdeaPreview.captions.map(c => (
                  <span key={c.platform} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold">
                    {c.platform === 'X' ? 'X (Twitter)' : c.platform}
                  </span>
                ))}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTextIdeaPreview(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer transition-colors"
            title="Dismiss Creative Concept"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {activeAudioIdeaPreview && selectedGem.type === 'audio' && (
        <div className="flex items-start justify-between gap-3 p-3 bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/20 rounded-sm text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-[11px] text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="animate-pulse" />
                {activeAudioIdeaPreview.conceptTitle}
              </span>
              <span className="text-[10px] text-slate-400">· {activeAudioIdeaPreview.angle}</span>
              <span className="px-1.5 py-0.5 rounded-xs bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-bold text-[9px] uppercase tracking-wider">
                Voice: {activeAudioIdeaPreview.voiceDirection.recommendedVoice} ({activeAudioIdeaPreview.voiceDirection.emotion})
              </span>
              <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9px] uppercase tracking-wider">
                Music: {activeAudioIdeaPreview.musicDirection.genre} · {activeAudioIdeaPreview.musicDirection.tempoBpm} BPM
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-medium">
              {activeAudioIdeaPreview.voiceDirection.performanceNotes}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-2 pt-1.5 border-t border-violet-500/10">
              <button
                type="button"
                onClick={() => setPrompt(activeAudioIdeaPreview.voiceoverScript)}
                className="px-2 py-0.5 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/40 dark:hover:bg-violet-900/70 text-violet-700 dark:text-violet-300 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Populate Command Input with Voiceover Script"
              >
                <Volume2 size={11} />
                Use Voiceover Script
              </button>
              <button
                type="button"
                onClick={() => setPrompt(activeAudioIdeaPreview.musicDirection.musicalBrief)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Populate Command Input with Music Direction"
              >
                <Music size={11} />
                Use Music Direction
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveAudioIdeaPreview(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer transition-colors"
            title="Dismiss Audio Creative Concept"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {credits < estimatedCost && (
        <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-sm animate-in fade-in">
          <span className="flex items-center gap-1.5 font-medium">
            <AlertCircle size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
            Estimated cost: {estimatedCost} credits (Available: {credits})
          </span>
          <button
            type="button"
            onClick={() => openCreditGate({
              service: selectedGem.name,
              requiredCredits: estimatedCost,
              availableCredits: credits
            })}
            className="font-bold underline hover:text-amber-800 dark:hover:text-amber-200 cursor-pointer text-[11px]"
          >
            Need credits? Get Credits →
          </button>
        </div>
      )}

      <div className="relative group">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Describe the ${selectedGem.type} you want to create for ${brandGuidelines.name}...`}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm p-5 pr-16 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:border-slate-900 dark:focus:border-white transition-all resize-none h-32 font-light"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="absolute bottom-4 right-4 w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-sm flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
};
