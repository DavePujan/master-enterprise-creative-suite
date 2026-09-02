import { useState, useEffect, useRef } from 'react';
import { 
  type Gem, 
  type BrandGuidelines, 
  IMAGE_MODELS, 
  VIDEO_MODELS, 
  TEXT_MODELS, 
  generateCreative, 
  generateImage, 
  generateTTS, 
  pollVideo, 
  getQuotaErrorMessage 
} from '../../../../services/geminiService.js';
import { loadPreferences, savePreferences } from '../../../../lib/preferences.js';
import { downloadFile } from '../../../../lib/utils.js';

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

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCreativePrompt, setIsGeneratingCreativePrompt] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [videoStatus, setVideoStatus] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState(() => loadPreferences().aspectRatio);

  const [productContext, setProductContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [faceContext, setFaceContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [firstFrameContext, setFirstFrameContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [lastFrameContext, setLastFrameContext] = useState<{ id: string; name: string; data: string } | null>(null);
  const [ingredientsContexts, setIngredientsContexts] = useState<{ id: string; name: string; data: string }[]>([]);

  const [videoDuration, setVideoDuration] = useState('7s');
  const [videoShotType, setVideoShotType] = useState<'Single Shot' | 'Multi-Shot Sequence' | 'Cinematic Storytelling'>('Single Shot');
  const [imageStyle, setImageStyle] = useState('Photorealistic, 8k resolution');
  const [voiceEmotion, setVoiceEmotion] = useState<'Neutral' | 'Cheerful' | 'Energetic' | 'Professional' | 'Calming'>('Neutral');

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(() => loadPreferences().audioVolume);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(() => loadPreferences().audioVoice);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-image');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedGemIdRef = useRef(selectedGem.id);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Slideshow Controls
  const [slideshowOverlay, setSlideshowOverlay] = useState(0.6);
  const [slideshowTheme, setSlideshowTheme] = useState<'light' | 'dark' | 'brand'>('dark');
  const [slideshowFont, setSlideshowFont] = useState<'sans' | 'serif'>('sans');
  const [selectedPresentationTheme, setSelectedPresentationTheme] = useState<any>(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Warnings and Refinements
  const [softWarning, setSoftWarning] = useState<any>(null);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Sync Preferences to Cookies / LocalStorage
  useEffect(() => {
    savePreferences({
      aspectRatio,
      audioVoice: selectedVoice,
      audioVolume
    });
  }, [aspectRatio, selectedVoice, audioVolume]);

  useEffect(() => {
    selectedGemIdRef.current = selectedGem.id;
  }, [selectedGem.id]);

  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update selected model when gem changes
  useEffect(() => {
    if (selectedGem.type === 'image') {
      setSelectedModel(IMAGE_MODELS[0].id);
    } else if (selectedGem.type === 'video') {
      setSelectedModel(VIDEO_MODELS[0].id);
      setAspectRatio('9:16');
      setVideoDuration('7s');
      setVideoShotType('Single Shot');
    } else if (selectedGem.type === 'text' || selectedGem.type === 'campaign' || selectedGem.type === 'slideshow') {
      setSelectedModel(TEXT_MODELS[0].id);
    } else {
      setSelectedModel('');
    }
  }, [selectedGem.id, selectedGem.type]);

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

  useEffect(() => {
    if (brandGuidelines) {
      const themes = generateCustomThemes(brandGuidelines);
      setSelectedPresentationTheme(themes[0]);
    }
  }, [brandGuidelines]);

  const getActiveCost = () => {
    if (selectedGem.type === 'image') {
      const model = IMAGE_MODELS.find(m => m.id === selectedModel);
      return model?.credits ?? selectedGem.cost;
    }
    if (selectedGem.type === 'video') {
      const model = VIDEO_MODELS.find(m => m.id === selectedModel);
      return model?.credits ?? selectedGem.cost;
    }
    return selectedGem.cost;
  };

  const getBrandStyles = (): React.CSSProperties => {
    return {
      '--brand-primary': brandGuidelines?.colors?.[0] || '#0f172a',
      '--brand-secondary': brandGuidelines?.colors?.[1] || '#334155',
      '--font-primary': brandGuidelines?.typography?.primary || 'Outfit',
      '--font-secondary': brandGuidelines?.typography?.secondary || 'Inter',
    } as React.CSSProperties;
  };

  const checkCompatibilityAndConfirm = (onConfirm: () => void) => {
    let unsupportedImages: string[] = [];

    if (selectedGem.type === 'image') {
      if (selectedModel === 'openai/gpt-image-2') {
        // Fully supported!
      } else if (selectedModel === 'gemini-2.5-flash-image') {
        if (faceContext) unsupportedImages.push('Face / Model Context Image');
      }
    } else if (selectedGem.type === 'video') {
      if (selectedModel === 'veo-3.1-lite-generate-preview') {
        if (firstFrameContext) unsupportedImages.push('First Frame Image');
        if (lastFrameContext) unsupportedImages.push('Last Frame Image');
        if (productContext) unsupportedImages.push('Product Context Image');
        if (faceContext) unsupportedImages.push('Face / Model Context Image');
        if (ingredientsContexts.length > 0) unsupportedImages.push('Ingredients Reference Images');
      } else if (selectedModel === 'veo-3.1-fast-generate-preview') {
        if (lastFrameContext) unsupportedImages.push('Last Frame Image');
        if (productContext) unsupportedImages.push('Product Context Image');
        if (faceContext) unsupportedImages.push('Face / Model Context Image');
        if (ingredientsContexts.length > 0) unsupportedImages.push('Ingredients Reference Images');
      } else if (selectedModel === 'veo-3.1-generate-preview') {
        if (productContext) unsupportedImages.push('Product Context Image');
        if (faceContext) unsupportedImages.push('Face / Model Context Image');
        if (ingredientsContexts.length > 0 && aspectRatio !== '16:9') {
          unsupportedImages.push('Ingredients Reference Images (requires 16:9 aspect ratio)');
        }
      }
    }

    if (unsupportedImages.length > 0) {
      setSoftWarning({
        message: `The image uploaded will not be taken into reference by the selected model (${selectedModel || 'Active model'}).\n\nDo you still want to continue?`,
        onProceed: onConfirm,
        recommendedModel: selectedGem.type === 'image' ? 'openai/gpt-image-2' : 'veo-3.1-generate-preview'
      });
    } else {
      onConfirm();
    }
  };

  const startPolling = (operation: any, concept?: any, originalGemId?: string, originalPrompt?: string) => {
    if (pollInterval.current) clearInterval(pollInterval.current);
    
    let currentOp = operation;
    pollInterval.current = setInterval(async () => {
      try {
        const updatedOp = await pollVideo(currentOp);
        currentOp = updatedOp;
        
        if (updatedOp.done) {
          if (pollInterval.current) clearInterval(pollInterval.current);
          const videoUri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
          
          if (!videoUri) {
            throw new Error("Video generation completed but no URI was returned.");
          }
          
          const isFalVideo = !!currentOp?.engine || !!updatedOp?.engine;
          const fetchUrl = isFalVideo ? `/api/proxy?url=${encodeURIComponent(videoUri)}` : videoUri;
          const fetchHeaders: HeadersInit = isFalVideo ? {} : { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' };

          const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: fetchHeaders,
          });
          const blob = await response.blob();
          const videoUrl = URL.createObjectURL(blob);
          
          const res = { type: 'video', data: videoUrl, concept };
          addToHistory(res, originalGemId, originalPrompt);
          
          if (saveAsset) {
            saveAsset(`Video: ${concept?.visualPrompt?.slice(0, 20) || 'Creative Render'}`, videoUrl, 'video');
          }

          if (selectedGemIdRef.current === originalGemId) {
            setResult(res);
            setVideoStatus('');
          }
          setIsGenerating(false);
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (pollInterval.current) clearInterval(pollInterval.current);
        setIsGenerating(false);
        if (selectedGemIdRef.current === originalGemId) {
          setResult({ type: 'error', message: 'Video generation failed.' });
        }
      }
    }, 10000);
  };

  const executeGenerate = async () => {
    setIsGenerating(true);
    
    const isSlideshow = selectedGem.id === 'slideshow-maker';
    const existingSlideshow = result?.type === 'slideshow' ? result : null;
    
    if (!isSlideshow) {
      setResult(null);
    }
    
    setVideoStatus('');
    
    try {
      let fullPrompt = prompt;
      if (selectedGem.id === 'brand-copy' && selectedLanguage !== 'English') {
        fullPrompt = `[Output Language: ${selectedLanguage}] ${prompt}`;
      }

      const selectedAssets = [...assets];
      if (productContext) {
        selectedAssets.push({
          id: productContext.id,
          name: productContext.name,
          data: productContext.data,
          type: 'product_context'
        } as any);
      }
      if (faceContext) {
        selectedAssets.push({
          id: faceContext.id,
          name: faceContext.name,
          data: faceContext.data,
          type: 'face_context'
        } as any);
      }
      if (firstFrameContext) {
        selectedAssets.push({
          id: firstFrameContext.id,
          name: firstFrameContext.name,
          data: firstFrameContext.data,
          type: 'first_frame'
        } as any);
      }
      if (lastFrameContext) {
        selectedAssets.push({
          id: lastFrameContext.id,
          name: lastFrameContext.name,
          data: lastFrameContext.data,
          type: 'last_frame'
        } as any);
      }
      if (ingredientsContexts.length > 0) {
        ingredientsContexts.forEach(ing => {
          selectedAssets.push({
            id: ing.id,
            name: ing.name,
            data: ing.data,
            type: 'ingredient_context'
          } as any);
        });
      }

      const res = await generateCreative(selectedGem, fullPrompt, { 
        aspectRatio,
        guidelines: brandGuidelines,
        model: selectedModel,
        videoDuration,
        videoShotType,
        imageStyle,
        assets: selectedAssets,
        bakeLogo: bakeLogoOnGeneration
      });

      setCredits(prev => prev - getActiveCost());
      
      if (res?.type === 'video_op') {
        setResult(null);
        setVideoStatus('Generating video... This may take a few minutes.');
        startPolling(res.operation, res.concept, selectedGem.id, fullPrompt);
      } else if (res?.type === 'slideshow') {
        const isCorporate = selectedGem.id === 'corporate-presentations';
        const newSlides = res.data;
        
        let updatedSlides;
        if (isCorporate) {
          updatedSlides = [...newSlides];
        } else {
          const newSlide = newSlides[0];
          updatedSlides = existingSlideshow 
            ? [...existingSlideshow.data, newSlide]
            : [newSlide];
        }
        
        const updatedRes = {
          ...res,
          data: updatedSlides
        };
        
        setResult(updatedRes);
        setIsGenerating(false);
        
        if (isCorporate) {
          setCurrentSlide(0);
        } else if (existingSlideshow) {
          setCurrentSlide(updatedSlides.length - 1);
        }
        
        const originalGemId = selectedGem.id;
        const originalPrompt = fullPrompt;

        if (isCorporate) {
          const firstSlide = updatedSlides[0];
          if (firstSlide && firstSlide.visualPrompt) {
            const bgRes = await generateImage(
              `Presentation background visual for slide titled "${firstSlide.title}": ${firstSlide.visualPrompt}`,
              brandGuidelines,
              aspectRatio || '16:9',
              'gemini-2.5-flash-image'
            );
            const bgUrl = bgRes.url;
            
            const finalSlides = [...updatedSlides];
            finalSlides[0] = { ...finalSlides[0], bgImage: bgUrl };
            const finalRes = { ...res, data: finalSlides };
            
            if (selectedGemIdRef.current === originalGemId) {
              setResult(finalRes);
            }
            addToHistory(finalRes, originalGemId, originalPrompt);
          } else {
            addToHistory(updatedRes, originalGemId, originalPrompt);
          }
        } else {
          addToHistory(updatedRes, originalGemId, originalPrompt);
        }
      } else {
        setResult(res);
        setIsGenerating(false);

        if (res.type === 'storyline' && res.data?.scenes) {
          const scenes = res.data.scenes;
          const originalGemId = selectedGem.id;
          const originalPrompt = fullPrompt;

          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            try {
              const sceneImgRes = await generateImage(
                `Scene ${i + 1} for storyline "${res.data.storyTitle}": ${scene.visualPrompt || scene.narrative}`,
                brandGuidelines,
                aspectRatio,
                selectedModel || 'gemini-2.5-flash-image',
                selectedAssets
              );
              const sceneImg = sceneImgRes.url;

              if (selectedGemIdRef.current === originalGemId) {
                setResult((prev: any) => {
                  if (!prev || prev.type !== 'storyline' || !prev.data?.scenes) return prev;
                  const newScenes = [...prev.data.scenes];
                  newScenes[i] = { ...newScenes[i], image: sceneImg };
                  return { ...prev, data: { ...prev.data, scenes: newScenes } };
                });
              }
            } catch (imgErr) {
              console.error(`Failed to generate storyline scene image ${i + 1}:`, imgErr);
            }
          }

          if (saveAsset) {
            saveAsset(`Story: ${res.data.storyTitle || 'Narrative Visuals'}`, JSON.stringify(res.data), 'doc');
          }
        } else if (res.type === 'campaign' && res.data?.visualPrompts) {
          const visualPrompts = res.data.visualPrompts;
          const originalGemId = selectedGem.id;
          const originalPrompt = fullPrompt;

          const images: string[] = [];
          for (let i = 0; i < visualPrompts.length; i++) {
            try {
              const imgRes = await generateImage(
                `Campaign visual moment ${i + 1}: ${visualPrompts[i]}`,
                brandGuidelines,
                aspectRatio || '1:1',
                'gemini-2.5-flash-image'
              );
              images.push(imgRes.url);
            } catch (err) {
              console.error(`Failed to generate campaign image ${i + 1}:`, err);
            }
          }

          if (images.length > 0) {
            const updatedRes = {
              ...res,
              data: { ...res.data, images }
            };
            if (selectedGemIdRef.current === originalGemId) {
              setResult(updatedRes);
            }

            addToHistory(updatedRes, originalGemId, originalPrompt);
          } else {
            addToHistory(res, originalGemId, originalPrompt);
          }
        } else {
          addToHistory(res, selectedGem.id, fullPrompt);
        }
      }
    } catch (error: any) {
      console.error(error);
      const quotaMsg = getQuotaErrorMessage(error);
      const message = quotaMsg || "Failed to generate creative. Please try again.";
      setResult({ type: 'error', message });
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    const activeCost = getActiveCost();
    if (credits < activeCost) {
      alert(`Not enough credits. This action requires ${activeCost} credits, but you only have ${credits}.`);
      return;
    }

    checkCompatibilityAndConfirm(() => {
      executeGenerate();
    });
  };

  const handleTTS = async (text: string) => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current && !audioRef.current.ended && audioRef.current.readyState >= 2) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    if (isTTSLoading) return;
    setIsTTSLoading(true);
    try {
      const url = await generateTTS(text, selectedVoice, voiceEmotion);
      setAudioUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
      } else {
        audioRef.current = new Audio(url);
      }
      
      audioRef.current.onloadedmetadata = () => {
        setAudioDuration(audioRef.current?.duration || 0);
      };

      audioRef.current.ontimeupdate = () => {
        setAudioProgress(audioRef.current?.currentTime || 0);
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
      };

      audioRef.current.volume = audioVolume;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("TTS failed:", error);
    } finally {
      setIsTTSLoading(false);
    }
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      downloadFile(audioUrl, `${brandGuidelines.name.toLowerCase().replace(/\s+/g, '-')}-narrative-audio-${Date.now()}.wav`);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result?.data) return;
    try {
      setIsDownloadingPDF(true);
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: aspectRatio === '9:16' ? 'portrait' : 'landscape',
        unit: 'px',
        format: [800, 600]
      });

      const slides = result.data;
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
      setIsDownloadingPDF(false);
    }
  };

  const handleDownloadStorylineZip = async () => {
    if (!result?.data?.scenes) return;
    try {
      setIsDownloadingZip(true);
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const scenes = result.data.scenes;
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
      setIsDownloadingZip(false);
    }
  };

  const handleRefineWithAI = async () => {
    if (!refinePrompt.trim() || !result?.data) return;
    try {
      setIsRefining(true);
      const selectedAssets: any[] = [];
      if (productContext) selectedAssets.push(productContext);
      if (faceContext) selectedAssets.push(faceContext);
      if (ingredientsContexts.length > 0) selectedAssets.push(...ingredientsContexts);

      const refined = await generateImage(
        `Refinement edit: ${refinePrompt}. Original prompt: ${prompt}`,
        brandGuidelines,
        aspectRatio,
        selectedModel || 'gemini-2.5-flash-image',
        selectedAssets
      );
      setResult({ ...result, data: refined.url, groundingMetadata: refined.groundingMetadata });
      setIsRefineModalOpen(false);
      setRefinePrompt('');
    } catch (e) {
      console.error("Failed to refine asset:", e);
    } finally {
      setIsRefining(false);
    }
  };


  return {
    prompt,
    setPrompt,
    isGenerating,
    setIsGenerating,
    isGeneratingCreativePrompt,
    setIsGeneratingCreativePrompt,
    result,
    setResult,
    videoStatus,
    setVideoStatus,
    aspectRatio,
    setAspectRatio,
    selectedModel,
    setSelectedModel,
    videoDuration,
    setVideoDuration,
    videoShotType,
    setVideoShotType,
    imageStyle,
    setImageStyle,
    voiceEmotion,
    setVoiceEmotion,
    selectedVoice,
    setSelectedVoice,
    selectedLanguage,
    setSelectedLanguage,
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
    currentSlide,
    setCurrentSlide,
    slideshowOverlay,
    setSlideshowOverlay,
    slideshowTheme,
    setSlideshowTheme,
    slideshowFont,
    setSlideshowFont,
    selectedPresentationTheme,
    setSelectedPresentationTheme,
    isTTSLoading,
    isPlaying,
    audioVolume,
    setAudioVolume,
    audioProgress,
    setAudioProgress,
    audioDuration,
    audioUrl,
    setAudioUrl,
    isDownloadingPDF,
    isDownloadingZip,
    softWarning,
    setSoftWarning,
    isRefineModalOpen,
    setIsRefineModalOpen,
    refinePrompt,
    setRefinePrompt,
    isRefining,
    handleRefineWithAI,
    getBrandStyles,
    handleGenerate,
    handleTTS,
    handleDownloadAudio,
    handleDownloadPDF,
    handleDownloadStorylineZip,
    getActiveCost
  };
}
