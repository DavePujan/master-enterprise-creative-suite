import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { IMAGE_MODELS, VIDEO_MODELS, TEXT_MODELS, GENERIC_GEMS } from '@web/infrastructure/ai/modelRegistry.js';
import { generateCreative, generateImage, generateTTS, pollVideo } from '@web/infrastructure/ai/geminiService.js';
import { getQuotaErrorMessage } from '@web/infrastructure/ai/geminiClient.js';
import { loadPreferences, savePreferences } from '@web/lib/preferences.js';
import { downloadFile } from '@web/lib/utils.js';
import { apiClient } from '@web/infrastructure/api/apiClient.js';

export interface GemExecutionState {
  prompt: string;
  isGenerating: boolean;
  isGeneratingCreativePrompt: boolean;
  result: any;
  error?: string | null;
  videoStatus: string;
  selectedModel: string;
  aspectRatio: string;
  videoDuration: string;
  videoShotType: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling';
  imageStyle: string;
  voiceEmotion: 'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming';
  selectedVoice: string;
  selectedLanguage: string;
  audioGenerationType: 'voiceover' | 'music';
  musicMode: 'clip' | 'full-track';
  musicGenre: string;
  musicMood: string;
  speakerMode: 'single' | 'two-speaker';
  speakerTwoVoice: string;
  productContext: { id: string; name: string; data: string } | null;
  faceContext: { id: string; name: string; data: string } | null;
  firstFrameContext: { id: string; name: string; data: string } | null;
  lastFrameContext: { id: string; name: string; data: string } | null;
  ingredientsContexts: { id: string; name: string; data: string }[];
  currentSlide: number;
  slideshowOverlay: number;
  slideshowTheme: 'light' | 'dark' | 'brand';
  slideshowFont: 'sans' | 'serif';
  selectedPresentationTheme: any;
  isTTSLoading: boolean;
  isPlaying: boolean;
  audioProgress: number;
  audioDuration: number;
  audioUrl: string | null;
  isDownloadingPDF: boolean;
  isDownloadingZip: boolean;
  softWarning: any;
  ttsError: string | null;
  isRefineModalOpen: boolean;
  refinePrompt: string;
  isRefining: boolean;
}

export const getDefaultGemState = (gem: Gem, guidelines?: BrandGuidelines): GemExecutionState => {
  let defaultModel = 'gemini-2.5-flash';
  let defaultAspectRatio = '1:1';
  let defaultDuration = '7s';
  let defaultShotType: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling' = 'Single Shot';

  if (gem.type === 'image') {
    defaultModel = IMAGE_MODELS[0]?.id || 'gemini-2.5-flash-image';
    defaultAspectRatio = loadPreferences().aspectRatio || '1:1';
  } else if (gem.type === 'video') {
    defaultModel = VIDEO_MODELS[0]?.id || 'veo-3.1-generate-preview';
    defaultAspectRatio = '16:9';
    defaultDuration = '7s';
    defaultShotType = 'Single Shot';
  } else if (gem.type === 'text' || gem.type === 'campaign' || gem.type === 'slideshow' || gem.type === 'storyline') {
    defaultModel = TEXT_MODELS[0]?.id || 'gemini-2.5-flash';
    defaultAspectRatio = '1:1';
  }

  const brandColors = guidelines?.colors && guidelines.colors.length > 0 ? guidelines.colors : ['#0f172a', '#334155'];
  const pColor = brandColors[0] || '#0f172a';
  const sColor = brandColors[1] || brandColors[0] || '#334155';
  const brandName = guidelines?.name || 'Brand';
  const primaryFont = guidelines?.typography?.primary || 'sans';

  const defaultTheme = {
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
  };

  return {
    prompt: '',
    isGenerating: false,
    isGeneratingCreativePrompt: false,
    result: null,
    error: null,
    videoStatus: '',
    selectedModel: defaultModel,
    aspectRatio: defaultAspectRatio,
    videoDuration: defaultDuration,
    videoShotType: defaultShotType,
    imageStyle: 'Photorealistic, 8k resolution',
    voiceEmotion: 'Neutral',
    selectedVoice: loadPreferences().audioVoice || 'Kore',
    selectedLanguage: 'English',
    audioGenerationType: 'voiceover',
    musicMode: 'clip',
    musicGenre: 'Cinematic Electronic',
    musicMood: 'Uplifting',
    speakerMode: 'single',
    speakerTwoVoice: 'Puck',
    productContext: null,
    faceContext: null,
    firstFrameContext: null,
    lastFrameContext: null,
    ingredientsContexts: [],
    currentSlide: 0,
    slideshowOverlay: 0.6,
    slideshowTheme: 'dark',
    slideshowFont: 'sans',
    selectedPresentationTheme: defaultTheme,
    isTTSLoading: false,
    isPlaying: false,
    audioProgress: 0,
    audioDuration: 0,
    audioUrl: null,
    isDownloadingPDF: false,
    isDownloadingZip: false,
    softWarning: null,
    ttsError: null,
    isRefineModalOpen: false,
    refinePrompt: '',
    isRefining: false,
  };
};

export interface UseCreativeExecutionOptions {
  user?: any;
  selectedGem: Gem;
  brandGuidelines: BrandGuidelines;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  assets?: any[];
  bakeLogoOnGeneration?: boolean;
  saveAsset?: (name: string, data: string, type: 'image' | 'doc' | 'video' | 'audio') => Promise<void>;
  addToHistory: (res: any, specificGemId?: string, specificPrompt?: string) => void;
  selectedModel?: string;
  aspectRatio?: string;
  videoShotType?: 'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling';
  imageStyle?: string;
  voiceEmotion?: 'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming';
  selectedLanguage?: string;
  selectedVoice?: string;
  selectedPresentationTheme?: any;
  productContext?: { id: string; name: string; data: string } | null;
  faceContext?: { id: string; name: string; data: string } | null;
  firstFrameContext?: { id: string; name: string; data: string } | null;
  lastFrameContext?: { id: string; name: string; data: string } | null;
  ingredientsContexts?: { id: string; name: string; data: string }[];
  textLayers?: any[];
  setTextLayers?: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedTextWordId?: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useCreativeExecution(options: UseCreativeExecutionOptions) {
  const {
    user,
    selectedGem,
    brandGuidelines,
    credits,
    setCredits,
    assets = [],
    bakeLogoOnGeneration = false,
    saveAsset,
    addToHistory
  } = options;

  // Multi-gem isolated state storage
  const [gemStates, setGemStates] = useState<Record<string, GemExecutionState>>({});
  const [audioVolume, setAudioVolumeState] = useState(() => loadPreferences().audioVolume);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedGemRef = useRef(selectedGem);
  const pollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    selectedGemRef.current = selectedGem;
  }, [selectedGem]);

  // Clean up all background intervals and audio on unmount
  useEffect(() => {
    return () => {
      pollIntervalsRef.current.forEach(int => clearInterval(int));
      pollIntervalsRef.current.clear();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Compute active state for currently selected gem
  const activeState = useMemo(() => {
    return gemStates[selectedGem.id] || getDefaultGemState(selectedGem, brandGuidelines);
  }, [gemStates, selectedGem, brandGuidelines]);

  // List of gem IDs currently executing in the background
  const generatingGemIds = useMemo(() => {
    return Object.entries(gemStates)
      .filter(([_, state]) => state.isGenerating)
      .map(([gemId]) => gemId);
  }, [gemStates]);

  // Helper to update active gem's state slice
  const updateActiveState = useCallback(
    (patch: Partial<GemExecutionState> | ((prev: GemExecutionState) => Partial<GemExecutionState>)) => {
      const activeGemId = selectedGemRef.current.id;
      setGemStates(prev => {
        const current = prev[activeGemId] || getDefaultGemState(selectedGemRef.current, brandGuidelines);
        const updates = typeof patch === 'function' ? patch(current) : patch;
        return {
          ...prev,
          [activeGemId]: {
            ...current,
            ...updates
          }
        };
      });
    },
    [brandGuidelines]
  );

  // Helper to update ANY specific gem's state slice (targeted)
  const updateGemState = useCallback(
    (gemId: string, patch: Partial<GemExecutionState> | ((prev: GemExecutionState) => Partial<GemExecutionState>)) => {
      setGemStates(prev => {
        const gem = GENERIC_GEMS.find(g => g.id === gemId) || selectedGemRef.current;
        const current = prev[gemId] || getDefaultGemState(gem, brandGuidelines);
        const updates = typeof patch === 'function' ? patch(current) : patch;
        return {
          ...prev,
          [gemId]: {
            ...current,
            ...updates
          }
        };
      });
    },
    [brandGuidelines]
  );

  // Active Gem State Setters
  const setPrompt = useCallback((val: string) => updateActiveState({ prompt: val }), [updateActiveState]);
  const setIsGenerating = useCallback((val: boolean) => updateActiveState({ isGenerating: val }), [updateActiveState]);
  const setIsGeneratingCreativePrompt = useCallback((val: boolean) => updateActiveState({ isGeneratingCreativePrompt: val }), [updateActiveState]);
  const setResult = useCallback(
    (val: any) => updateActiveState(prev => ({ result: typeof val === 'function' ? val(prev.result) : val })),
    [updateActiveState]
  );
  const setVideoStatus = useCallback((val: string) => updateActiveState({ videoStatus: val }), [updateActiveState]);
  const setAspectRatio = useCallback((val: string) => {
    savePreferences({ aspectRatio: val });
    updateActiveState({ aspectRatio: val });
  }, [updateActiveState]);
  const setSelectedModel = useCallback((val: string) => updateActiveState({ selectedModel: val }), [updateActiveState]);
  const setVideoDuration = useCallback((val: string) => updateActiveState({ videoDuration: val }), [updateActiveState]);
  const setVideoShotType = useCallback((val: any) => updateActiveState({ videoShotType: val }), [updateActiveState]);
  const setImageStyle = useCallback((val: string) => updateActiveState({ imageStyle: val }), [updateActiveState]);
  const setVoiceEmotion = useCallback((val: any) => updateActiveState({ voiceEmotion: val }), [updateActiveState]);
  const setSelectedVoice = useCallback((val: string) => {
    savePreferences({ audioVoice: val });
    updateActiveState({ selectedVoice: val });
  }, [updateActiveState]);
  const setSelectedLanguage = useCallback((val: string) => updateActiveState({ selectedLanguage: val }), [updateActiveState]);
  const setAudioGenerationType = useCallback((val: 'voiceover' | 'music') => updateActiveState({ audioGenerationType: val }), [updateActiveState]);
  const setMusicMode = useCallback((val: 'clip' | 'full-track') => updateActiveState({ musicMode: val }), [updateActiveState]);
  const setMusicGenre = useCallback((val: string) => updateActiveState({ musicGenre: val }), [updateActiveState]);
  const setMusicMood = useCallback((val: string) => updateActiveState({ musicMood: val }), [updateActiveState]);
  const setSpeakerMode = useCallback((val: 'single' | 'two-speaker') => updateActiveState({ speakerMode: val }), [updateActiveState]);
  const setSpeakerTwoVoice = useCallback((val: string) => updateActiveState({ speakerTwoVoice: val }), [updateActiveState]);
  const setSelectedPresentationTheme = useCallback((val: any) => updateActiveState({ selectedPresentationTheme: val }), [updateActiveState]);
  const setProductContext = useCallback((val: any) => updateActiveState({ productContext: val }), [updateActiveState]);
  const setFaceContext = useCallback((val: any) => updateActiveState({ faceContext: val }), [updateActiveState]);
  const setFirstFrameContext = useCallback((val: any) => updateActiveState({ firstFrameContext: val }), [updateActiveState]);
  const setLastFrameContext = useCallback((val: any) => updateActiveState({ lastFrameContext: val }), [updateActiveState]);
  const setIngredientsContexts = useCallback(
    (val: any) => updateActiveState(prev => ({ ingredientsContexts: typeof val === 'function' ? val(prev.ingredientsContexts) : val })),
    [updateActiveState]
  );
  const setCurrentSlide = useCallback(
    (val: any) => updateActiveState(prev => ({ currentSlide: typeof val === 'function' ? val(prev.currentSlide) : val })),
    [updateActiveState]
  );
  const setSlideshowOverlay = useCallback(
    (val: any) => updateActiveState(prev => ({ slideshowOverlay: typeof val === 'function' ? val(prev.slideshowOverlay) : val })),
    [updateActiveState]
  );
  const setSlideshowTheme = useCallback(
    (val: any) => updateActiveState(prev => ({ slideshowTheme: typeof val === 'function' ? val(prev.slideshowTheme) : val })),
    [updateActiveState]
  );
  const setSlideshowFont = useCallback(
    (val: any) => updateActiveState(prev => ({ slideshowFont: typeof val === 'function' ? val(prev.slideshowFont) : val })),
    [updateActiveState]
  );
  const setAudioVolume = useCallback((val: number) => {
    savePreferences({ audioVolume: val });
    if (audioRef.current) audioRef.current.volume = val;
    setAudioVolumeState(val);
  }, []);
  const setAudioProgress = useCallback((val: number) => updateActiveState({ audioProgress: val }), [updateActiveState]);
  const setAudioUrl = useCallback((val: string | null) => updateActiveState({ audioUrl: val }), [updateActiveState]);
  const setSoftWarning = useCallback((val: any) => updateActiveState({ softWarning: val }), [updateActiveState]);
  const setIsRefineModalOpen = useCallback((val: boolean) => updateActiveState({ isRefineModalOpen: val }), [updateActiveState]);
  const setRefinePrompt = useCallback((val: string) => updateActiveState({ refinePrompt: val }), [updateActiveState]);

  // Target-specific setters (e.g. for history loading)
  const setGemResult = useCallback((gemId: string, result: any) => {
    updateGemState(gemId, { result });
  }, [updateGemState]);

  const setGemPrompt = useCallback((gemId: string, prompt: string) => {
    updateGemState(gemId, { prompt });
  }, [updateGemState]);

  const getActiveCost = useCallback((targetGem?: Gem) => {
    const gem = targetGem || selectedGemRef.current;
    const currentGemState = gemStates[gem.id] || getDefaultGemState(gem, brandGuidelines);
    if (gem.type === 'image') {
      const model = IMAGE_MODELS.find(m => m.id === currentGemState.selectedModel);
      return model?.credits ?? gem.cost;
    }
    if (gem.type === 'video') {
      const model = VIDEO_MODELS.find(m => m.id === currentGemState.selectedModel);
      return model?.credits ?? gem.cost;
    }
    return gem.cost;
  }, [gemStates, brandGuidelines]);

  const getBrandStyles = (): React.CSSProperties => {
    return {
      '--brand-primary': brandGuidelines?.colors?.[0] || '#0f172a',
      '--brand-secondary': brandGuidelines?.colors?.[1] || '#334155',
      '--font-primary': brandGuidelines?.typography?.primary || 'Outfit',
      '--font-secondary': brandGuidelines?.typography?.secondary || 'Inter',
    } as React.CSSProperties;
  };

  // Video Polling Gateway
  const startPolling = useCallback((operation: any, concept?: any, originalGemId?: string, originalPrompt?: string) => {
    const gemId = originalGemId || selectedGemRef.current.id;

    // Clear existing interval for this gem if any
    if (pollIntervalsRef.current.has(gemId)) {
      clearInterval(pollIntervalsRef.current.get(gemId)!);
      pollIntervalsRef.current.delete(gemId);
    }

    let currentOp = operation;
    const interval = setInterval(async () => {
      try {
        const updatedOp = await pollVideo(currentOp);
        currentOp = updatedOp;

        if (updatedOp.done) {
          clearInterval(interval);
          pollIntervalsRef.current.delete(gemId);

          const videoUri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
          if (!videoUri) {
            throw new Error("Video generation completed but no URI was returned.");
          }

          const fetchUrl = `/api/proxy?url=${encodeURIComponent(videoUri)}`;
          const response = await fetch(fetchUrl, { method: 'GET' });
          const blob = await response.blob();
          const videoUrl = URL.createObjectURL(blob);

          const res = { type: 'video', data: videoUrl, concept };
          addToHistory(res, gemId, originalPrompt);

          if (saveAsset) {
            saveAsset(`Video: ${concept?.visualPrompt?.slice(0, 20) || 'Creative Render'}`, videoUrl, 'video');
          }

          updateGemState(gemId, {
            result: res,
            videoStatus: '',
            isGenerating: false,
          });
        }
      } catch (error) {
        console.error(`Polling error for gem ${gemId}:`, error);
        clearInterval(interval);
        pollIntervalsRef.current.delete(gemId);
        updateGemState(gemId, {
          isGenerating: false,
          videoStatus: '',
          result: { type: 'error', message: 'Video generation failed.' }
        });
      }
    }, 10000);

    pollIntervalsRef.current.set(gemId, interval);
  }, [addToHistory, saveAsset, updateGemState]);

  // Main Execution Routine: Isolated per Target Gem
  const executeGenerate = async (targetGemOverride?: Gem) => {
    const targetGem = targetGemOverride || selectedGemRef.current;
    const targetGemId = targetGem.id;
    const currentTargetState = gemStates[targetGemId] || getDefaultGemState(targetGem, brandGuidelines);
    const targetPrompt = currentTargetState.prompt;

    if (!targetPrompt.trim()) return;

    const isSlideshow = targetGem.id === 'corporate-presentations' || targetGem.id === 'slideshow-maker';
    const existingSlideshow = currentTargetState.result?.type === 'slideshow' ? currentTargetState.result : null;

    // 1. Mark target gem as generating without disturbing any other gem
    updateGemState(targetGemId, {
      isGenerating: true,
      result: isSlideshow ? existingSlideshow : null,
      videoStatus: '',
      error: null
    });

    try {
      let fullPrompt = targetPrompt;
      if (targetGem.id === 'strategy-captions' && currentTargetState.selectedLanguage !== 'English') {
        fullPrompt = `[Output Language: ${currentTargetState.selectedLanguage}] ${targetPrompt}`;
      }

      const selectedAssets = [...assets];
      if (currentTargetState.productContext) {
        selectedAssets.push({
          id: currentTargetState.productContext.id,
          name: currentTargetState.productContext.name,
          data: currentTargetState.productContext.data,
          type: 'product_context'
        } as any);
      }
      if (currentTargetState.faceContext) {
        selectedAssets.push({
          id: currentTargetState.faceContext.id,
          name: currentTargetState.faceContext.name,
          data: currentTargetState.faceContext.data,
          type: 'face_context'
        } as any);
      }
      if (currentTargetState.firstFrameContext) {
        selectedAssets.push({
          id: currentTargetState.firstFrameContext.id,
          name: currentTargetState.firstFrameContext.name,
          data: currentTargetState.firstFrameContext.data,
          type: 'first_frame'
        } as any);
      }
      if (currentTargetState.lastFrameContext) {
        selectedAssets.push({
          id: currentTargetState.lastFrameContext.id,
          name: currentTargetState.lastFrameContext.name,
          data: currentTargetState.lastFrameContext.data,
          type: 'last_frame'
        } as any);
      }
      if (currentTargetState.ingredientsContexts.length > 0) {
        currentTargetState.ingredientsContexts.forEach(ing => {
          selectedAssets.push({
            id: ing.id,
            name: ing.name,
            data: ing.data,
            type: 'ingredient_context'
          } as any);
        });
      }

      // 2. Perform asynchronous generation
      const res = await generateCreative(targetGem, fullPrompt, {
        aspectRatio: currentTargetState.aspectRatio,
        guidelines: brandGuidelines,
        model: currentTargetState.selectedModel,
        videoDuration: currentTargetState.videoDuration,
        videoShotType: currentTargetState.videoShotType,
        imageStyle: currentTargetState.imageStyle,
        assets: selectedAssets,
        bakeLogo: bakeLogoOnGeneration,
        voiceEmotion: currentTargetState.voiceEmotion,
        selectedVoice: currentTargetState.selectedVoice,
        audioGenerationType: currentTargetState.audioGenerationType,
        musicMode: currentTargetState.musicMode,
        musicGenre: currentTargetState.musicGenre,
        musicMood: currentTargetState.musicMood,
        speakerMode: currentTargetState.speakerMode,
        speakerTwoVoice: currentTargetState.speakerTwoVoice,
        selectedLanguageCode: currentTargetState.selectedLanguage === 'Hindi' ? 'hi-IN' : (currentTargetState.selectedLanguage === 'Marathi' ? 'mr-IN' : (currentTargetState.selectedLanguage === 'Gujarati' ? 'gu-IN' : (currentTargetState.selectedLanguage === 'Tamil' ? 'ta-IN' : (currentTargetState.selectedLanguage === 'Bengali' ? 'bn-IN' : 'en-US')))),
      });

      // 3. Settle / sync authoritative credits from server
      if (res?.newBalance !== undefined) {
        setCredits(res.newBalance);
      }
      apiClient.get<{ success: boolean; availableBalance: number }>('/api/payment/balance')
        .then(bal => {
          if (bal?.availableBalance !== undefined) setCredits(bal.availableBalance);
        })
        .catch(() => {});

      // 4. Handle output according to result type
      if (res?.type === 'video_op') {
        updateGemState(targetGemId, {
          result: null,
          videoStatus: 'Generating video... This may take a few minutes.'
        });
        startPolling(res.operation, res.concept, targetGemId, fullPrompt);
      } else if (res?.type === 'slideshow') {
        const isCorporate = targetGem.id === 'corporate-presentations';
        const newSlides = res.data;
        const updatedSlides = isCorporate
          ? [...newSlides]
          : (existingSlideshow ? [...existingSlideshow.data, newSlides[0]] : [newSlides[0]]);

        const updatedRes = { ...res, data: updatedSlides };

        updateGemState(targetGemId, {
          result: updatedRes,
          isGenerating: false,
          currentSlide: isCorporate ? 0 : updatedSlides.length - 1
        });

        if (isCorporate) {
          const firstSlide = updatedSlides[0];
          if (firstSlide && firstSlide.visualPrompt) {
            generateImage(
              `Presentation background visual for slide titled "${firstSlide.title}": ${firstSlide.visualPrompt}`,
              brandGuidelines,
              currentTargetState.aspectRatio || '16:9',
              'gemini-2.5-flash-image'
            ).then(bgRes => {
              if (bgRes?.url) {
                const finalSlides = [...updatedSlides];
                finalSlides[0] = { ...finalSlides[0], bgImage: bgRes.url };
                const finalRes = { ...res, data: finalSlides };
                updateGemState(targetGemId, { result: finalRes });
                addToHistory(finalRes, targetGemId, fullPrompt);
              }
            }).catch(() => {
              addToHistory(updatedRes, targetGemId, fullPrompt);
            });
          } else {
            addToHistory(updatedRes, targetGemId, fullPrompt);
          }
        } else {
          addToHistory(updatedRes, targetGemId, fullPrompt);
        }
      } else {
        // Standard Image / Text / Audio / Document
        updateGemState(targetGemId, {
          result: res,
          isGenerating: false
        });

        if (res.type === 'storyline' && res.data?.scenes) {
          const scenes = res.data.scenes;
          // Progressively render scene images in background for this storyline
          (async () => {
            for (let i = 0; i < scenes.length; i++) {
              const scene = scenes[i];
              try {
                const sceneImgRes = await generateImage(
                  `Scene ${i + 1} for storyline "${res.data.storyTitle}": ${scene.visualPrompt || scene.narrative}`,
                  brandGuidelines,
                  currentTargetState.aspectRatio,
                  currentTargetState.selectedModel || 'gemini-2.5-flash-image',
                  selectedAssets
                );
                const sceneImg = sceneImgRes.url;
                updateGemState(targetGemId, prev => {
                  if (!prev.result || prev.result.type !== 'storyline' || !prev.result.data?.scenes) return prev;
                  const newScenes = [...prev.result.data.scenes];
                  newScenes[i] = { ...newScenes[i], image: sceneImg };
                  return {
                    result: { ...prev.result, data: { ...prev.result.data, scenes: newScenes } }
                  };
                });
              } catch (imgErr) {
                console.error(`Failed to generate storyline scene image ${i + 1}:`, imgErr);
              }
            }
          })();

          if (saveAsset) {
            saveAsset(`Story: ${res.data.storyTitle || 'Narrative Visuals'}`, JSON.stringify(res.data), 'doc');
          }
        } else if (res.type === 'campaign' && res.data?.visualPrompts) {
          const visualPrompts = res.data.visualPrompts;
          (async () => {
            const images: string[] = [];
            for (let i = 0; i < visualPrompts.length; i++) {
              try {
                const imgRes = await generateImage(
                  `Campaign visual moment ${i + 1}: ${visualPrompts[i]}`,
                  brandGuidelines,
                  currentTargetState.aspectRatio || '1:1',
                  'gemini-2.5-flash-image'
                );
                images.push(imgRes.url);
              } catch (err) {
                console.error(`Failed to generate campaign image ${i + 1}:`, err);
              }
            }

            if (images.length > 0) {
              const updatedRes = { ...res, data: { ...res.data, images } };
              updateGemState(targetGemId, { result: updatedRes });
              addToHistory(updatedRes, targetGemId, fullPrompt);
            }
          })();
        } else {
          if (saveAsset) {
            if (res.type === 'image') {
              saveAsset(`Render: ${fullPrompt.slice(0, 20)}`, res.data, 'image');
            } else if (res.type === 'doc') {
              saveAsset(`Doc: ${fullPrompt.slice(0, 20)}`, res.data, 'doc');
            }
          }
          addToHistory(res, targetGemId, fullPrompt);
        }
      }
    } catch (error: any) {
      console.error(`Creative generation failed for gem ${targetGemId}:`, error);
      const quotaMsg = getQuotaErrorMessage(error);
      const message = quotaMsg || error?.message || "Failed to generate creative. Please try again.";
      updateGemState(targetGemId, {
        isGenerating: false,
        error: message,
        result: { type: 'error', message }
      });
    }
  };

  const checkCompatibilityAndConfirm = (onConfirm: () => void) => {
    let unsupportedImages: string[] = [];
    const model = activeState.selectedModel;

    if (selectedGem.type === 'image') {
      if (activeState.faceContext) {
        unsupportedImages.push('Face / Model Context Image (Face reference is unavailable)');
      }
      if (activeState.productContext && (model === 'flux-schnell' || model === 'fal-ai/flux/schnell')) {
        unsupportedImages.push('Product Context Image (FLUX Schnell is text-only)');
      }
    } else if (selectedGem.type === 'video') {
      if (model === 'veo-3.1-lite-generate-preview') {
        if (activeState.firstFrameContext) unsupportedImages.push('First Frame Image');
        if (activeState.lastFrameContext) unsupportedImages.push('Last Frame Image');
        if (activeState.productContext) unsupportedImages.push('Product Context Image');
        if (activeState.faceContext) unsupportedImages.push('Face / Model Context Image');
        if (activeState.ingredientsContexts.length > 0) unsupportedImages.push('Ingredients Reference Images');
      } else if (model === 'veo-3.1-fast-generate-preview') {
        if (activeState.lastFrameContext) unsupportedImages.push('Last Frame Image');
        if (activeState.productContext) unsupportedImages.push('Product Context Image');
        if (activeState.faceContext) unsupportedImages.push('Face / Model Context Image');
        if (activeState.ingredientsContexts.length > 0) unsupportedImages.push('Ingredients Reference Images');
      } else if (model === 'veo-3.1-generate-preview') {
        if (activeState.productContext) unsupportedImages.push('Product Context Image');
        if (activeState.faceContext) unsupportedImages.push('Face / Model Context Image');
        if (activeState.ingredientsContexts.length > 0 && activeState.aspectRatio !== '16:9') {
          unsupportedImages.push('Ingredients Reference Images (requires 16:9 aspect ratio)');
        }
      }
    }

    if (unsupportedImages.length > 0) {
      setSoftWarning({
        message: `The image uploaded will not be taken into reference by the selected model (${model || 'Active model'}).\n\nDo you still want to continue?`,
        onProceed: onConfirm,
        recommendedModel: selectedGem.type === 'image' ? 'openai/gpt-image-2' : 'veo-3.1-generate-preview'
      });
    } else {
      onConfirm();
    }
  };

  const handleGenerate = async () => {
    if (!activeState.prompt.trim()) return;

    const activeCost = getActiveCost();
    if (credits < activeCost) {
      alert(`Not enough credits. This action requires ${activeCost} credits, but you only have ${credits}.`);
      return;
    }

    checkCompatibilityAndConfirm(() => {
      executeGenerate();
    });
  };

  // Audio / TTS Controls
  const handleTTS = async (text: string, forceBrowserVoice: boolean = false) => {
    if (activeState.isPlaying) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      audioRef.current?.pause();
      updateActiveState({ isPlaying: false });
      return;
    }

    if (audioRef.current && !audioRef.current.ended && audioRef.current.readyState >= 2 && !forceBrowserVoice) {
      audioRef.current.play();
      updateActiveState({ isPlaying: true, ttsError: null });
      return;
    }

    if (activeState.isTTSLoading) return;
    updateActiveState({ isTTSLoading: true, ttsError: null });

    const playWithBrowserVoice = (cleanText: string) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Microsoft'))) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
          updateActiveState({ isPlaying: true, isTTSLoading: false, ttsError: null });
        };
        utterance.onend = () => {
          updateActiveState({ isPlaying: false });
        };
        utterance.onerror = (e) => {
          console.warn('Browser SpeechSynthesis error:', e);
          updateActiveState({ isPlaying: false, isTTSLoading: false });
        };

        window.speechSynthesis.speak(utterance);
        return true;
      }
      return false;
    };

    if (forceBrowserVoice) {
      const ok = playWithBrowserVoice(text);
      if (!ok) {
        updateActiveState({
          isTTSLoading: false,
          ttsError: "Browser speech synthesis is not supported on this device."
        });
      }
      return;
    }

    try {
      const url = await generateTTS(text, activeState.selectedVoice, activeState.voiceEmotion);
      updateActiveState({ audioUrl: url, ttsError: null });

      if (audioRef.current) {
        audioRef.current.src = url;
      } else {
        audioRef.current = new Audio(url);
      }

      audioRef.current.onloadedmetadata = () => {
        updateActiveState({ audioDuration: audioRef.current?.duration || 0 });
      };

      audioRef.current.ontimeupdate = () => {
        updateActiveState({ audioProgress: audioRef.current?.currentTime || 0 });
      };

      audioRef.current.onended = () => {
        updateActiveState({ isPlaying: false, audioProgress: 0 });
      };

      audioRef.current.volume = audioVolume;
      await audioRef.current.play();
      updateActiveState({ isPlaying: true });
    } catch (error: any) {
      console.error("TTS failed:", error);
      const rawMsg = error?.message || error?.error || String(error);

      let friendlyError = "Speech generation temporarily unavailable. You can retry or play using your device voice below.";
      if (rawMsg.includes("429") || rawMsg.includes("quota") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
        friendlyError = "Google Voice AI quota or rate limit reached. You can play using your device voice below or retry shortly.";
      } else if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("AI_SERVICE_BUSY")) {
        friendlyError = "Voice AI service is temporarily experiencing high traffic. Please retry in a few moments.";
      } else if (rawMsg.includes("safety") || rawMsg.includes("blocked")) {
        friendlyError = "Audio synthesis was flagged by safety filters for this text.";
      } else if (rawMsg.includes("Network") || rawMsg.includes("Failed to fetch")) {
        friendlyError = "Network connection issue while requesting speech audio.";
      }

      updateActiveState({
        ttsError: friendlyError,
        isPlaying: false
      });
    } finally {
      updateActiveState({ isTTSLoading: false });
    }
  };

  const handleDownloadAudio = () => {
    if (activeState.audioUrl) {
      downloadFile(
        activeState.audioUrl,
        `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-narrative-audio-${Date.now()}.wav`
      );
    }
  };

  // PDF Export
  const handleDownloadPDF = async () => {
    if (!activeState.result?.data) return;
    try {
      updateActiveState({ isDownloadingPDF: true });
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: activeState.aspectRatio === '9:16' ? 'portrait' : 'landscape',
        unit: 'px',
        format: [800, 600]
      });

      const slides = activeState.result.data;
      for (let i = 0; i < slides.length; i++) {
        if (i > 0) doc.addPage();
        const slide = slides[i];
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 800, 600, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text(slide.title || `Slide ${i + 1}`, 40, 60);
        doc.setFontSize(14);
        doc.text(slide.content || '', 40, 100, { maxWidth: 720 });
      }

      doc.save(`${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-presentation-${Date.now()}.pdf`);
    } catch (e) {
      console.error("Failed to generate PDF:", e);
    } finally {
      updateActiveState({ isDownloadingPDF: false });
    }
  };

  // ZIP Export
  const handleDownloadStorylineZip = async () => {
    if (!activeState.result?.data?.scenes) return;
    try {
      updateActiveState({ isDownloadingZip: true });
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const scenes = activeState.result.data.scenes;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (scene.image) {
          const resp = await fetch(scene.image);
          const blob = await resp.blob();
          zip.file(`scene_${i + 1}.png`, blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      downloadFile(url, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-storyline-${Date.now()}.zip`);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate Storyline ZIP:", e);
    } finally {
      updateActiveState({ isDownloadingZip: false });
    }
  };

  // AI Refinement
  const handleRefineWithAI = async () => {
    if (!activeState.refinePrompt.trim() || !activeState.result?.data) return;
    try {
      updateActiveState({ isRefining: true });
      const selectedAssets: any[] = [];
      if (activeState.productContext) selectedAssets.push(activeState.productContext);
      if (activeState.faceContext) selectedAssets.push(activeState.faceContext);
      if (activeState.ingredientsContexts.length > 0) selectedAssets.push(...activeState.ingredientsContexts);

      const refined = await generateImage(
        `Refinement edit: ${activeState.refinePrompt}. Original prompt: ${activeState.prompt}`,
        brandGuidelines,
        activeState.aspectRatio,
        activeState.selectedModel || 'gemini-2.5-flash-image',
        selectedAssets
      );

      updateActiveState(prev => ({
        result: { ...prev.result, data: refined.url, groundingMetadata: refined.groundingMetadata },
        isRefineModalOpen: false,
        refinePrompt: '',
        isRefining: false
      }));
    } catch (e) {
      console.error("Failed to refine asset:", e);
      updateActiveState({ isRefining: false });
    }
  };

  return {
    // Current Active Gem State (reactive to selectedGem)
    prompt: activeState.prompt,
    setPrompt,
    isGenerating: activeState.isGenerating,
    setIsGenerating,
    isGeneratingCreativePrompt: activeState.isGeneratingCreativePrompt,
    setIsGeneratingCreativePrompt,
    result: activeState.result,
    setResult,
    videoStatus: activeState.videoStatus,
    setVideoStatus,
    aspectRatio: activeState.aspectRatio,
    setAspectRatio,
    selectedModel: activeState.selectedModel,
    setSelectedModel,
    videoDuration: activeState.videoDuration,
    setVideoDuration,
    videoShotType: activeState.videoShotType,
    setVideoShotType,
    imageStyle: activeState.imageStyle,
    setImageStyle,
    voiceEmotion: activeState.voiceEmotion,
    setVoiceEmotion,
    selectedVoice: activeState.selectedVoice,
    setSelectedVoice,
    selectedLanguage: activeState.selectedLanguage,
    setSelectedLanguage,
    audioGenerationType: activeState.audioGenerationType,
    setAudioGenerationType,
    musicMode: activeState.musicMode,
    setMusicMode,
    musicGenre: activeState.musicGenre,
    setMusicGenre,
    musicMood: activeState.musicMood,
    setMusicMood,
    speakerMode: activeState.speakerMode,
    setSpeakerMode,
    speakerTwoVoice: activeState.speakerTwoVoice,
    setSpeakerTwoVoice,
    productContext: activeState.productContext,
    setProductContext,
    faceContext: activeState.faceContext,
    setFaceContext,
    firstFrameContext: activeState.firstFrameContext,
    setFirstFrameContext,
    lastFrameContext: activeState.lastFrameContext,
    setLastFrameContext,
    ingredientsContexts: activeState.ingredientsContexts,
    setIngredientsContexts,
    currentSlide: activeState.currentSlide,
    setCurrentSlide,
    slideshowOverlay: activeState.slideshowOverlay,
    setSlideshowOverlay,
    slideshowTheme: activeState.slideshowTheme,
    setSlideshowTheme,
    slideshowFont: activeState.slideshowFont,
    setSlideshowFont,
    selectedPresentationTheme: activeState.selectedPresentationTheme,
    setSelectedPresentationTheme,
    isTTSLoading: activeState.isTTSLoading,
    isPlaying: activeState.isPlaying,
    audioVolume,
    setAudioVolume,
    audioProgress: activeState.audioProgress,
    setAudioProgress,
    audioDuration: activeState.audioDuration,
    audioUrl: activeState.audioUrl,
    setAudioUrl,
    isDownloadingPDF: activeState.isDownloadingPDF,
    isDownloadingZip: activeState.isDownloadingZip,
    softWarning: activeState.softWarning,
    setSoftWarning,
    isRefineModalOpen: activeState.isRefineModalOpen,
    setIsRefineModalOpen,
    refinePrompt: activeState.refinePrompt,
    setRefinePrompt,
    isRefining: activeState.isRefining,

    // Multi-Gem Execution & Tracking
    generatingGemIds,
    setGemResult,
    setGemPrompt,
    updateGemState,

    // Actions & Handlers
    handleRefineWithAI,
    getBrandStyles,
    handleGenerate,
    ttsError: activeState.ttsError,
    setTtsError: (err: string | null) => updateActiveState({ ttsError: err }),
    handleTTS,
    handleDownloadAudio,
    handleDownloadPDF,
    handleDownloadStorylineZip,
    getActiveCost
  };
}

