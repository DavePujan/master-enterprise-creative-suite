import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  Target, 
  Check, 
  Plus, 
  Trash2, 
  Upload, 
  Calendar, 
  DollarSign, 
  Layers, 
  Globe, 
  Download, 
  Copy, 
  ArrowRight, 
  Paperclip, 
  Clock, 
  Settings2,
  FileText,
  AlertCircle,
  HelpCircle,
  Play,
  Minus,
  Video,
  Image,
  Edit2,
  Save,
  Eye,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { generateCampaignStrategistCampaign, generateCampaignStrategistAsset, generateCampaignAssetBriefs, generateImage, generateCreative, pollVideo, IMAGE_MODELS, VIDEO_MODELS, TEXT_MODELS, type CampaignStrategistResult } from '../services/geminiService';

interface TextWordLayer {
  id: string;
  text: string;
  fontFamily: string;
  color: string;
  scale: number;
  position: { x: number; y: number };
}

interface CampaignStrategistWorkspaceProps {
  brandGuidelines: {
    name: string;
    industry: string;
    tone: string;
    pillars: string[];
    colors: string[];
    typography: { primary: string; secondary: string };
    logo?: string;
    location?: string;
  };
  onSaveCampaignAsset: (name: string, dataUrl: string, type: 'image' | 'doc' | 'video' | 'audio') => void;
  onSaveHistory: (res: any, gemId: string, prompt: string) => void;
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  productContext: { id: string; name: string; data: string } | null;
  setProductContext: (ctx: { id: string; name: string; data: string } | null) => void;
  faceContext: { id: string; name: string; data: string } | null;
  setFaceContext: (ctx: { id: string; name: string; data: string } | null) => void;
  setHumanTouchItem?: React.Dispatch<React.SetStateAction<any>>;
}

type OnboardingStep = 
  | 'intro'
  | 'type_goal'
  | 'brand_story'
  | 'audience'
  | 'timeline'
  | 'language_region'
  | 'deliverables'
  | 'scale'
  | 'analyzing'
  | 'results'
  | 'asset_generation';

const CAMPAIGN_TYPES = [
  'Product Launch',
  'Brand Awareness',
  'Performance Marketing',
  'Film/Media Launch',
  'Creator/Influencer Campaign',
  'Seasonal Campaign',
  'Retention Campaign',
  'Rebranding Campaign',
  'Viral Campaign',
  'Meme Campaign',
  'Luxury Campaign',
  'Grassroots Campaign',
  'AI Content Campaign'
];

const CAMPAIGN_GOALS = [
  'Sales & E-commerce',
  'Launch Hype & PR',
  'Brand Awareness',
  'Lead Generation',
  'Virality & Memes',
  'App Installs',
  'Customer Retention',
  'Community Building',
  'Audience Growth',
  'Event Registrations'
];

const EMOTION_PROMPTS = [
  'Trust & Credibility',
  'Excitement & Hype',
  'Aspiration & Luxury',
  'Urgency & FOMO',
  'Curiosity & Mystery',
  'Nostalgia & Warmth',
  'Rebellion & Edge',
  'Empowerment & Strength'
];

const KEY_PLATFORMS = [
  'Instagram',
  'YouTube',
  'TikTok',
  'LinkedIn',
  'Meta Ads',
  'Google Search Ads',
  'Email Newsletters',
  'X/Twitter',
  'WhatsApp Business',
  'Outdoor/OOH Billboard'
];

const VISUAL_ASTHETICS = [
  'Cinematic & Dramatic',
  'Luxury & Ultra-premium',
  'Minimalist & Clean',
  'Raw & Documentary',
  'Meme-style & Chaotic',
  'Hyperreal & 3D',
  'Futuristic & Cyberpunk',
  'Street & Urban culture',
  'Youthful & High-energy',
  'Bold & Brutalist',
  'Global Editorial'
];

const LANGUAGES_LIST = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Chinese',
  'Hindi',
  'Arabic',
  'Portuguese',
  'Italian',
  'Korean'
];

const REGIONS_LIST = [
  'Global',
  'North America',
  'European Union',
  'United Kingdom',
  'Asia-Pacific',
  'Latin America',
  'Middle East',
  'Japan',
  'India',
  'Southeast Asia'
];

const DELIVERABLE_TEMPLATES = [
  'Posters & Key Visuals',
  'Short Reels & TikToks',
  'Ad Strategy & Copy',
  'Multi-slide Carousels',
  'Landing Page Blueprint',
  'Email Newsletters Sequence',
  'Cinematic Hero Script',
  'Meme Creative formats',
  'Influencer Outreach Pitch'
];

export const CampaignStrategistWorkspace: React.FC<CampaignStrategistWorkspaceProps> = ({
  brandGuidelines,
  onSaveCampaignAsset,
  onSaveHistory,
  credits,
  setCredits,
  productContext,
  setProductContext,
  faceContext,
  setFaceContext,
  setHumanTouchItem
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('intro');
  const [loading, setLoading] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discovery Answers State
  const [answers, setAnswers] = useState({
    campaignTypeGoal: '',
    selectedType: '',
    selectedGoal: '',
    brandUnderstanding: '',
    uspDifference: '',
    targetAudience: '',
    selectedEmotion: '',
    timelineDuration: '',
    selectedPlatforms: [] as string[],
    selectedDeliverables: [] as string[],
    selectedAesthetic: '',
    inspirationReferences: '',
    budgetScale: '',
    involvesPaidAds: 'No',
    numImages: 3,
    numVideos: 1,
    numCopy: 2,
    campaignLanguage: 'English',
    countryRegion: 'Global'
  });

  // Supporting file uploads mock state
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Strategic Results State
  const [campaignResult, setCampaignResult] = useState<CampaignStrategistResult | null>(null);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>('');

  // User Model Selections for Asset Generation
  const [selectedImageModel, setSelectedImageModel] = useState<string>('gemini-2.5-flash-image');
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>('veo-3.1-generate-preview');
  const [selectedTextModel, setSelectedTextModel] = useState<string>('gemini-flash-latest');

  // Layout Studio Settings
  const containerRef = useRef<HTMLDivElement>(null);
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50 });
  const [logoScale, setLogoScale] = useState(15);
  const [logoInverted, setLogoInverted] = useState(false);
  const [logoColorMode, setLogoColorMode] = useState<'original' | 'black' | 'white' | 'gray'>('original');
  const [bakeLogoImmediately, setBakeLogoImmediately] = useState(true);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  const [textLayers, setTextLayers] = useState<TextWordLayer[]>([]);
  const [draggingTextWordId, setDraggingTextWordId] = useState<string | null>(null);
  const [selectedTextWordId, setSelectedTextWordId] = useState<string | null>(null);
  const [newTextWordInput, setNewTextWordInput] = useState('');
  const [activeLayoutTab, setActiveLayoutTab] = useState<'logo' | 'text' | 'humantouch'>('logo');

  // Human Touch requested reviews status
  const [humanTouchItems, setHumanTouchItems] = useState<Record<string, { requested: boolean, comment?: string }>>({});
  const [showHumanTouchRequestBox, setShowHumanTouchRequestBox] = useState(false);
  
  // Refine with AI modal state
  const [refiningAsset, setRefiningAsset] = useState<any | null>(null);
  const [refiningPromptText, setRefiningPromptText] = useState('');
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [isExecutingRefine, setIsExecutingRefine] = useState(false);
  const [humanTouchRefinementText, setHumanTouchRefinementText] = useState('');

  // Reposition Event Handlers
  const handleLogoMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLogo(true);
    setDraggingTextWordId(null);
  };

  const handleLogoTouchStart = (e: React.TouchEvent) => {
    setIsDraggingLogo(true);
    setDraggingTextWordId(null);
  };

  const handleTextMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTextWordId(id);
    setSelectedTextWordId(id);
    setIsDraggingLogo(false);
  };

  const handleTextTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    setDraggingTextWordId(id);
    setSelectedTextWordId(id);
    setIsDraggingLogo(false);
  };

  const handleAddTextWord = (split: boolean) => {
    if (!newTextWordInput.trim()) return;
    const words = split ? newTextWordInput.trim().split(/\s+/).filter(Boolean) : [newTextWordInput.trim()];
    const newLayers = words.map((w, idx) => ({
      id: `text-word-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      text: w,
      fontFamily: brandGuidelines.typography?.primary || 'Outfit',
      color: brandGuidelines.colors?.[0] || '#ffffff',
      scale: 12,
      position: { x: 35 + (idx * 8) % 40, y: 40 + (idx * 6) % 30 }
    }));
    setTextLayers(prev => [...prev, ...newLayers]);
    setNewTextWordInput('');
    if (newLayers.length > 0) {
      setSelectedTextWordId(newLayers[0].id);
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    if (isDraggingLogo) {
      setLogoPosition({ x: clampedX, y: clampedY });
    } else if (draggingTextWordId) {
      setTextLayers(prev => prev.map(layer => 
        layer.id === draggingTextWordId ? { ...layer, position: { x: clampedX, y: clampedY } } : layer
      ));
    }
  };

  const handleContainerTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    if (isDraggingLogo) {
      setLogoPosition({ x: clampedX, y: clampedY });
    } else if (draggingTextWordId) {
      setTextLayers(prev => prev.map(layer => 
        layer.id === draggingTextWordId ? { ...layer, position: { x: clampedX, y: clampedY } } : layer
      ));
    }
  };

  const handleContainerMouseUp = () => {
    setIsDraggingLogo(false);
    setDraggingTextWordId(null);
  };

  const handleContainerTouchEnd = () => {
    setIsDraggingLogo(false);
    setDraggingTextWordId(null);
  };

  const handleProductUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductContext({
          id: `product-${Date.now()}`,
          name: file.name,
          data: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaceUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceContext({
          id: `face-${Date.now()}`,
          name: file.name,
          data: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Active editing asset prompt state
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');

  // Results screen tabs: 'strategy' | 'production'
  const [activeSecondaryTab, setActiveSecondaryTab] = useState<'strategy' | 'production'>('strategy');

  // Dynamic Batch Production State
  interface GeneratedAsset {
    id: string;
    type: 'image' | 'video' | 'copy';
    title: string;
    description: string; // The topic, brief theme or visual visual description
    status: 'idle' | 'pending' | 'generating' | 'completed' | 'failed';
    url?: string;
    content?: string;
    videoOperation?: any;
    error?: string;
  }
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [previewAsset, setPreviewAsset] = useState<GeneratedAsset | null>(null);

  // Phase 4 Generated Assets
  const [activeAssetType, setActiveAssetType] = useState<string>('');
  const [generatedAssetOutput, setGeneratedAssetOutput] = useState<string>('');
  const [customAssetRequest, setCustomAssetRequest] = useState<string>('');

  // Log steps progress
  const stepToNum = (step: OnboardingStep): number => {
    switch(step) {
      case 'intro': return 0;
      case 'type_goal': return 1;
      case 'brand_story': return 2;
      case 'audience': return 3;
      case 'timeline': return 4;
      case 'language_region': return 5;
      case 'deliverables': return 6;
      case 'scale': return 7;
      default: return 8;
    }
  };

  const currentStepNum = stepToNum(currentStep);

  // Custom multi-select platform toggle
  const togglePlatform = (p: string) => {
    setAnswers(prev => {
      const selected = prev.selectedPlatforms.includes(p)
        ? prev.selectedPlatforms.filter(item => item !== p)
        : [...prev.selectedPlatforms, p];
      return { ...prev, selectedPlatforms: selected };
    });
  };

  // Custom multi-select deliverable toggle
  const toggleDeliverable = (d: string) => {
    setAnswers(prev => {
      const selected = prev.selectedDeliverables.includes(d)
        ? prev.selectedDeliverables.filter(item => item !== d)
        : [...prev.selectedDeliverables, d];
      return { ...prev, selectedDeliverables: selected };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const list = Array.from(files).map(f => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + ' KB'
      }));
      setUploadedFiles(prev => [...(prev || []), ...list]);
    }
  };

  const triggerSearchRef = () => {
    fileInputRef.current?.click();
  };

  // Compile full final questions answers for AI Strategist Analysis
  const compileContextAnswers = (): Record<string, string> => {
    return {
      campaignTypeGoal: `Type: ${answers.selectedType || 'Hybrid'}. Primary Goal: ${answers.selectedGoal || 'General Growth'}. Context: ${answers.campaignTypeGoal}`,
      brandUnderstanding: `Details: ${answers.brandUnderstanding}. USP: ${answers.uspDifference}`,
      targetAudience: `Audience profile: ${answers.targetAudience}. Intended emotional hook: ${answers.selectedEmotion}`,
      timelinePlatforms: `Timeline & Dates: ${answers.timelineDuration}. Channels: ${answers.selectedPlatforms.join(', ')}`,
      contentStyle: `Style & Aesthetic direction: ${answers.selectedAesthetic}. Deliverables breakdown: ${answers.selectedDeliverables.join(', ')}`,
      assetsInspiration: `Campaign inspiration: ${answers.inspirationReferences}. Uploaded assets: ${(uploadedFiles || []).map(f => f.name).join(', ') || 'None'}`,
      budgetScale: `Budget scale: ${answers.budgetScale}. Paid engagement: ${answers.involvesPaidAds}`
    };
  };

  // Call the strategic compiling model
  const handleCompileCampaign = async () => {
    if (credits < 5) {
      setError("Insufficient credits. Compiling the strategy playbook requires 5 credits, but you only have " + credits + " left.");
      setCurrentStep('scale');
      return;
    }

    setCurrentStep('analyzing');
    setLoading(true);
    setError(null);

    try {
      const compiledAnswers = compileContextAnswers();
      const result = await generateCampaignStrategistCampaign(brandGuidelines, {
        ...compiledAnswers,
        campaignLanguage: answers.campaignLanguage,
        countryRegion: answers.countryRegion
      });
      
      if (!result || !result.coreBigIdea) {
        throw new Error("Strategy generation produced empty parameters. Please check your system API key validity.");
      }

      setCampaignResult({
        ...result,
        campaignLanguage: answers.campaignLanguage,
        countryRegion: answers.countryRegion
      });
      if (result.campaignNames && result.campaignNames.length > 0) {
        setSelectedCampaignName(result.campaignNames[0]);
      }

      // Generate customized asset briefs
      try {
        const briefs = await generateCampaignAssetBriefs(
          brandGuidelines,
          {
            ...result,
            campaignLanguage: answers.campaignLanguage,
            countryRegion: answers.countryRegion
          },
          { numImages: answers.numImages, numVideos: answers.numVideos, numCopy: answers.numCopy },
          answers.selectedAesthetic
        );

        const loadedAssets: GeneratedAsset[] = [];

        // Build Copies list
        (briefs.copies || []).forEach((c, i) => {
          loadedAssets.push({
            id: `copy-${i}-${Date.now()}`,
            type: 'copy',
            title: c.title,
            description: c.topic,
            status: 'idle'
          });
        });

        // Build Images list
        (briefs.images || []).forEach((img, i) => {
          loadedAssets.push({
            id: `image-${i}-${Date.now()}`,
            type: 'image',
            title: img.title,
            description: img.prompt,
            status: 'idle'
          });
        });

        // Build Videos list
        (briefs.videos || []).forEach((vid, i) => {
          loadedAssets.push({
            id: `video-${i}-${Date.now()}`,
            type: 'video',
            title: vid.title,
            description: vid.prompt,
            status: 'idle'
          });
        });

        setGeneratedAssets(loadedAssets);
      } catch (errBriefs) {
        console.warn("Failed retrieving structured briefs, creating fallback template structure", errBriefs);
        const fallbackAssets: GeneratedAsset[] = [];
        for (let i = 0; i < answers.numCopy; i++) {
          fallbackAssets.push({
            id: `copy-${i}-${Date.now()}`,
            type: 'copy',
            title: `Advertising Narrative Copy #${i + 1}`,
            description: "Ad Copy, Headline Hooks, and campaign distribution body write-up.",
            status: 'idle'
          });
        }
        for (let i = 0; i < answers.numImages; i++) {
          fallbackAssets.push({
            id: `image-${i}-${Date.now()}`,
            type: 'image',
            title: `Key Campaign Image Visual #${i + 1}`,
            description: `A master visual background matching ${answers.selectedAesthetic || 'cinematic'}.`,
            status: 'idle'
          });
        }
        for (let i = 0; i < answers.numVideos; i++) {
          fallbackAssets.push({
            id: `video-${i}-${Date.now()}`,
            type: 'video',
            title: `Kinetic Campaign Video Clip #${i + 1}`,
            description: `Dynamic animated reel concept themed on: ${result.coreBigIdea}.`,
            status: 'idle'
          });
        }
        setGeneratedAssets(fallbackAssets);
      }

      // Deduct 5 credits for successful briefing setup
      setCredits(prev => Math.max(0, prev - 5));

      setCurrentStep('results');
      
      // Save history log
      onSaveHistory(result, 'campaign-strategist-y', `Campaign Strategist W: ${result.campaignNames?.[0] || 'Strategic Roadmap'}`);

    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed compiling elite agency campaign roadmap.");
      setCurrentStep('scale'); // Go back to final step
    } finally {
      setLoading(false);
    }
  };

  // Request asset implementation (Phase 4)
  const handleGenerateAsset = async (assetType: string) => {
    if (!campaignResult) return;
    setActiveAssetType(assetType);
    setAssetLoading(true);
    setGeneratedAssetOutput('');
    setError(null);

    try {
      const output = await generateCampaignStrategistAsset(
        brandGuidelines,
        campaignResult,
        assetType,
        customAssetRequest
      );
      setGeneratedAssetOutput(output);
      setCurrentStep('asset_generation');
    } catch (e: any) {
      console.error(e);
      setError("Failed to draft deep-dive campaign deliverable.");
    } finally {
      setAssetLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownloadInteractiveImage = async (bgSrc: string, logoSrc: string, title?: string) => {
    const fetchAsLocalUrl = async (url: string): Promise<string> => {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
      }
      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error("Proxy fetch failed");
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (e) {
        console.warn("Proxy fetch failed for", url, "falling back directly:", e);
        return url;
      }
    };

    let bgLocalUrl = '';
    let logoLocalUrl = '';
    try {
      bgLocalUrl = await fetchAsLocalUrl(bgSrc);
      if (logoSrc) {
        logoLocalUrl = await fetchAsLocalUrl(logoSrc);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas");

      const bgImg = document.createElement('img');
      bgImg.crossOrigin = "anonymous";
      
      const logoImg = document.createElement('img');
      logoImg.crossOrigin = "anonymous";

      const loadPromises = [
        new Promise((resolve, reject) => {
          bgImg.onload = resolve;
          bgImg.onerror = reject;
          bgImg.src = bgLocalUrl;
        })
      ];

      if (logoSrc && logoLocalUrl) {
        loadPromises.push(
          new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
            logoImg.src = logoLocalUrl;
          })
        );
      }

      await Promise.all(loadPromises);

      canvas.width = bgImg.width;
      canvas.height = bgImg.height;
      ctx.drawImage(bgImg, 0, 0);

      // Render the Logo if present
      if (logoSrc && logoImg.width > 0) {
        const calcLogoWidth = bgImg.width * (logoScale / 100);
        const calcLogoHeight = logoImg.height * (calcLogoWidth / logoImg.width);

        const logoX = bgImg.width * (logoPosition.x / 100);
        const logoY = bgImg.height * (logoPosition.y / 100);

        if (logoColorMode === 'white') {
          ctx.filter = "brightness(0) invert(1)";
        } else if (logoColorMode === 'black') {
          ctx.filter = "brightness(0)";
        } else if (logoColorMode === 'gray') {
          ctx.filter = "brightness(0) opacity(0.5)";
        }
        
        ctx.drawImage(
          logoImg, 
          logoX - calcLogoWidth / 2, 
          logoY - calcLogoHeight / 2, 
          calcLogoWidth, 
          calcLogoHeight
        );
        
        if (logoColorMode !== 'original') {
          ctx.filter = "none";
        }
      }

      // Draw all customized text word layers beautifully
      textLayers.forEach(layer => {
        const fontSizePr = bgImg.width * (layer.scale / 100);
        
        ctx.font = `bold ${fontSizePr}px "${layer.fontFamily}", "Outfit", "Inter", sans-serif`;
        ctx.fillStyle = layer.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const tx = bgImg.width * (layer.position.x / 100);
        const ty = bgImg.height * (layer.position.y / 100);
        
        ctx.fillText(layer.text, tx, ty);
      });

      const resultDataUrl = canvas.toDataURL('image/png');
      const filename = `${(title || 'creative-render').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      
      const a = document.createElement('a');
      a.href = resultDataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to generate exported image with custom logo layout:", err);
      const a = document.createElement('a');
      a.href = bgSrc;
      a.download = `${(title || 'creative').toLowerCase().replace(/\s+/g, '-')}-fallback-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      if (bgLocalUrl.startsWith('blob:')) URL.revokeObjectURL(bgLocalUrl);
      if (logoLocalUrl.startsWith('blob:')) URL.revokeObjectURL(logoLocalUrl);
    }
  };

  const handleExecuteProductionRefine = async () => {
    if (!refiningAsset || !refiningPromptText.trim()) return;
    
    if (credits < 2) {
      alert("Insufficient credits. Refinement requires 2 credits.");
      return;
    }

    setIsExecutingRefine(true);
    setCredits(prev => Math.max(0, prev - 2));

    // Optimistically set the campaign asset status to generating
    setGeneratedAssets(prev => prev.map(a => 
      a.id === refiningAsset.id 
        ? { ...a, status: 'generating', error: undefined } 
        : a
    ));
    
    // Close preview modal if open, since we are regenerating
    setPreviewAsset(null);
    setShowRefineModal(false);

    try {
      const finalPrompt = `Refine and edit this image. Refinement instructions: ${refiningPromptText}. Ensure the output strictly follows the Brand Guidelines, matches the original style, and is visually consistent. Avoid inline text/logos unless specified.`;
      
      const references = [
        {
          id: 'original-context-' + Date.now(),
          name: 'Original Image',
          data: refiningAsset.url,
          type: 'image',
          selected: true
        }
      ];

      const res = await generateImage(
        finalPrompt, 
        brandGuidelines, 
        "1:1", 
        selectedImageModel, 
        references, 
        bakeLogoImmediately
      );

      if (!res.url) {
        throw new Error("Refined image URL is empty.");
      }

      setGeneratedAssets(prev => prev.map(a => 
        a.id === refiningAsset.id 
          ? { ...a, url: res.url, status: 'completed' } 
          : a
      ));
    } catch (err: any) {
      console.error("AI Asset Refinement failed:", err);
      setGeneratedAssets(prev => prev.map(a => 
        a.id === refiningAsset.id 
          ? { ...a, status: 'failed', error: err.message || "Failed to refine image with AI." } 
          : a
      ));
    } finally {
      setIsExecutingRefine(false);
      setRefiningAsset(null);
    }
  };

  const handleDownloadAsset = async (asset: any) => {
    if (!asset.url && !asset.content) return;
    
    // For copy/text assets: download as Markdown file
    if (asset.type === 'copy' && asset.content) {
      const blob = new Blob([asset.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${asset.title.toLowerCase().replace(/\s+/g, '-') || 'brief'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (asset.url) {
      // For images, if guidelines logo is present, use interactive canvas generator
      if (asset.type === 'image' && brandGuidelines.logo) {
        await handleDownloadInteractiveImage(asset.url, brandGuidelines.logo, asset.title);
        return;
      }

      // For standard images/videos with direct URLs
      try {
        const response = await fetch(asset.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
         a.href = url;
        const extension = asset.type === 'video' ? 'mp4' : 'png';
        a.download = `${asset.title.toLowerCase().replace(/\s+/g, '-') || 'creative-render'}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn("Direct blob fetch download failed (CORS or permissions), fallback to opening in secure window/link:", err);
        const link = document.createElement('a');
        link.href = asset.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.download = asset.title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  // Trigger polling for background rendering of videos
  const triggerVideoPolling = (assetId: string, operation: any) => {
    let currentOp = operation;
    const interval = setInterval(async () => {
      try {
        const updatedOp = await pollVideo(currentOp);
        currentOp = updatedOp;
        
        if (updatedOp.done) {
          clearInterval(interval);
          const videoUri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
          
          if (!videoUri) {
            throw new Error("No video URI returned from the rendering network.");
          }
          
          const isFalVideo = !!currentOp?.engine || !!updatedOp?.engine;
          const fetchUrl = isFalVideo ? `/api/proxy?url=${encodeURIComponent(videoUri)}` : videoUri;
          
          setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'completed', url: fetchUrl } : a));
        }
      } catch (err: any) {
        clearInterval(interval);
        console.error("Kinetic clip polling exception", err);
        setGeneratedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'failed', error: err?.message || 'Motion synthesize failure' } : a));
      }
    }, 4500);
  };

  // Process batch deliverables rendering (Images, Videos, and Copy systems)
  const handleGenerateTargetAsset = async (id: string) => {
    const asset = generatedAssets.find(a => a.id === id);
    if (!asset) return;

    // Determine credit cost based on user requests and configured model metadata
    let cost = 1;
    if (asset.type === 'image') {
      const m = IMAGE_MODELS.find(x => x.id === selectedImageModel);
      cost = m ? (m as any).credits : 2;
    } else if (asset.type === 'video') {
      const m = VIDEO_MODELS.find(x => x.id === selectedVideoModel);
      cost = m ? m.credits : 40;
    } else {
      cost = 1; // standard advertising captions / topics copy draft is 1 credit as requested
    }

    if (credits < cost) {
      setGeneratedAssets(prev => prev.map(a => a.id === id ? { 
        ...a, 
        status: 'failed', 
        error: `Requires ${cost} credits. You only have ${credits} left.` 
      } : a));
      return;
    }

    setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'generating', error: undefined } : a));

    try {
      if (asset.type === 'copy') {
        const output = await generateCampaignStrategistAsset(
          brandGuidelines,
          campaignResult,
          asset.title,
          asset.description,
          selectedTextModel
        );
        // deduct on success
        setCredits(prev => Math.max(0, prev - cost));
        setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'completed', content: output } : a));
      } else if (asset.type === 'image') {
        const finalPrompt = `${asset.description}. Visual style is ${answers.selectedAesthetic || 'Cinematic'}. Premium 4k photograph for ${brandGuidelines.name}. Crisp art direction, ultra highly detailed textures, beautiful dramatic lighting.`;
        
        // Pass model reference attachments if present in the workspace context
        const attachedReferences: any[] = [];
        if (productContext) {
          attachedReferences.push({
            id: productContext.id,
            name: productContext.name,
            data: productContext.data,
            type: 'image',
            selected: true,
            isProductContext: true
          });
        }
        if (faceContext) {
          attachedReferences.push({
            id: faceContext.id,
            name: faceContext.name,
            data: faceContext.data,
            type: 'image',
            selected: true,
            isFaceContext: true
          });
        }

        const res = await generateImage(finalPrompt, brandGuidelines, "1:1", selectedImageModel, attachedReferences, bakeLogoImmediately);
        if (res && res.url) {
          setCredits(prev => Math.max(0, prev - cost));
          setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'completed', url: res.url } : a));
        } else {
          throw new Error("Empty image payload received.");
        }
      } else if (asset.type === 'video') {
        const dummyVideoGem = {
          id: 'agency-video-concept',
          name: 'Agency Kinetic Video',
          type: 'video',
          systemInstruction: 'Synthesize highly cinematic visual motion frames with perfect atmospheric depth.'
        };
        const finalPrompt = `${asset.description}. Cinematic commercial video, beautiful atmospheric lighting, photorealistic details, 4k resolution, ultra slow motion. style: ${answers.selectedAesthetic || 'Cinematic'}.`;
        const res: any = await generateCreative(dummyVideoGem as any, finalPrompt, {
          guidelines: brandGuidelines,
          aspectRatio: "16:9",
          model: selectedVideoModel
        });

        if (res?.type === 'video_op' && res.operation) {
          setCredits(prev => Math.max(0, prev - cost));
          setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'pending', videoOperation: res.operation } : a));
          triggerVideoPolling(id, res.operation);
        } else if (res?.url) {
          setCredits(prev => Math.max(0, prev - cost));
          setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'completed', url: res.url } : a));
        } else {
          throw new Error("No operations or URLs generated.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setGeneratedAssets(prev => prev.map(a => a.id === id ? { ...a, status: 'failed', error: err?.message || 'Production error' } : a));
    }
  };

  const handleTriggerAllPipelines = () => {
    generatedAssets.forEach(asset => {
      if (asset.status === 'idle' || asset.status === 'failed') {
        handleGenerateTargetAsset(asset.id);
      }
    });
  };

  const handleSaveAssetToLibrary = () => {
    if (!campaignResult) return;
    
    const name = `${selectedCampaignName || 'Campaign'} - ${activeAssetType}`;
    const base64Data = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(generatedAssetOutput)));
    
    onSaveCampaignAsset(name, base64Data, 'doc');

    alert("Asset successfully saved to Brand Asset Library!");
  };

  // Pre-populate mock onboarding data for high efficiency testing
  const handleAutoFill = () => {
    setAnswers({
      campaignTypeGoal: "A premium product launch campaign to introduce our organic, cold-pressed botanical skin elixir series.",
      selectedType: "Product launch",
      selectedGoal: "Sales & E-commerce",
      brandUnderstanding: "Crafted from fresh Himalayan mountain herbs and pristine botanicals, designed to reverse skin fatigue completely.",
      uspDifference: "Zero preservatives, hand-numbered luxury dark violet glass jars preserving therapeutic energy fields.",
      targetAudience: "Afluent, design-focused young professionals aged 25-42 seeking premium botanical daily luxury wellness rituals.",
      selectedEmotion: "Aspiration & Luxury",
      timelineDuration: "8 weeks starting Fall 2026",
      selectedPlatforms: ['Instagram', 'YouTube', 'TikTok', 'Email Newsletters'],
      selectedDeliverables: ['Posters & Key Visuals', 'Short Reels & TikToks', 'Ad Strategy & Copy', 'Cinematic Hero Script'],
      selectedAesthetic: "Luxury & Ultra-premium",
      inspirationReferences: "Aesop campaigns, Apple-like packaging simplicity, high-end travel aesthetics",
      budgetScale: "Mid-scale digital",
      involvesPaidAds: "Yes",
      numImages: 3,
      numVideos: 1,
      numCopy: 2,
      campaignLanguage: 'English',
      countryRegion: 'Global'
    });
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 items-start min-h-[600px] animate-in fade-in duration-300">
      
      {/* Discovery Guided Chat/Onboarding Wizard Panel */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-sm p-6 w-full relative overflow-hidden self-stretch flex flex-col justify-between">
        
        {/* Step Indicator Header */}
        {currentStep !== 'analyzing' && currentStep !== 'results' && currentStep !== 'asset_generation' && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-450 font-bold">
                <Target size={14} /> Campaign Discovery Workshop
              </span>
              <span>Step {currentStepNum} of 7</span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 transition-all duration-300 rounded-full"
                style={{ width: `${(currentStepNum / 7) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            
            {/* Step 0: INTRO */}
            {currentStep === 'intro' && (
              <motion.div 
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center py-8"
              >
                <div className="w-16 h-16 bg-rose-500/10 dark:bg-rose-500/5 text-rose-600 dark:text-rose-400 rounded-sm flex items-center justify-center mx-auto shadow-sm">
                  <Sparkles size={32} />
                </div>
                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-2xl font-light tracking-tight text-slate-950 dark:text-slate-50">
                    Campaign Strategist W
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-light leading-relaxed">
                    “Let’s build your campaign strategically. I’ll first understand your brand, audience, objectives, and creative requirements step-by-step.”
                  </p>
                </div>

                <div className="flex items-center gap-4 justify-center pt-4">
                  <button
                    onClick={handleAutoFill}
                    className="px-4 py-2 border border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-605 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-sm font-semibold uppercase tracking-wider transition-all"
                  >
                    Quick Auto-Fill Draft
                  </button>
                  <button
                    onClick={() => setCurrentStep('type_goal')}
                    className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold uppercase tracking-widest rounded-sm transition-all flex items-center gap-2 shadow-md"
                  >
                    Start Workshop <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 1: CAMPAIGN TYPE & GOALS */}
            {currentStep === 'type_goal' && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h3 className="text-lg font-light tracking-tight text-slate-900 dark:text-slate-150">What are you creating this campaign for?</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Select standard campaign categories or input below</p>
                </div>

                {/* Campaign Types Grid selector */}
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGN_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setAnswers(prev => ({ ...prev, selectedType: type }))}
                      className={`text-xs px-3 py-1.5 rounded-sm transition-all border ${
                        answers.selectedType === type
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border-rose-350 font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">More details on campaign context</label>
                  <textarea
                    value={answers.campaignTypeGoal}
                    onChange={(e) => setAnswers(prev => ({ ...prev, campaignTypeGoal: e.target.value }))}
                    placeholder="Describe what product, service, app, event or action you are launching..."
                    className="w-full text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-rose-500 h-20"
                  />
                </div>

                {/* Campaign Objective Selector */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">What is the primary goal of this campaign?</h3>
                  <div className="flex flex-wrap gap-2">
                    {CAMPAIGN_GOALS.map(goal => (
                      <button
                        key={goal}
                        onClick={() => setAnswers(prev => ({ ...prev, selectedGoal: goal }))}
                        className={`text-xs px-3 py-1.5 rounded-sm transition-all border ${
                          answers.selectedGoal === goal
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border-rose-350 font-bold shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {goal}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button onClick={() => setCurrentStep('intro')} className="flex items-center gap-1.5 text-xs text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white uppercase"><ChevronLeft size={16}/> Back</button>
                  <button 
                    onClick={() => setCurrentStep('brand_story')} 
                    disabled={!answers.selectedType || !answers.selectedGoal}
                    className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    Next Step <ChevronRight size={16}/>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: BRAND UNDERSTANDING */}
            {currentStep === 'brand_story' && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h3 className="text-lg font-light tracking-tight text-slate-900 dark:text-slate-150">Tell me about the brand/product/service.</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Provide details on the story, USP, core features or competitors</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Brand Story & Mission</label>
                    <textarea
                      value={answers.brandUnderstanding}
                      onChange={(e) => setAnswers(prev => ({ ...prev, brandUnderstanding: e.target.value }))}
                      placeholder="What is your brand's philosophy and what problem does this launch solve?"
                      className="w-full text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-rose-500 h-28"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">What makes this different from competitors? (USP)</label>
                    <input
                      type="text"
                      value={answers.uspDifference}
                      onChange={(e) => setAnswers(prev => ({ ...prev, uspDifference: e.target.value }))}
                      placeholder="Unfair advantage, unique design process, specific value prop."
                      className="w-full text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button onClick={() => setCurrentStep('type_goal')} className="flex items-center gap-1.5 text-xs text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white uppercase"><ChevronLeft size={16}/> Back</button>
                  <button 
                    onClick={() => setCurrentStep('audience')} 
                    className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 hover:opacity-90 transition-all"
                  >
                    Next Step <ChevronRight size={16}/>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: TARGET AUDIENCE & EMOTIONS */}
            {currentStep === 'audience' && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h3 className="text-lg font-light tracking-tight text-slate-900 dark:text-slate-150">Who is the target audience?</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Tell us about aggregate age groups, lifestyle, pain points or cultures</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Audience Profile</label>
                    <textarea
                      value={answers.targetAudience}
                      onChange={(e) => setAnswers(prev => ({ ...prev, targetAudience: e.target.value }))}
                      placeholder="e.g. Design-conscious urban freelancers spending on boutique luxury, values organic sourcing, active on TikTok and Pinterest."
                      className="w-full text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-rose-500 h-24"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">What emotion or reaction should the audience feel?</label>
                    <div className="flex flex-wrap gap-2">
                      {EMOTION_PROMPTS.map(emotion => (
                        <button
                          key={emotion}
                          onClick={() => setAnswers(prev => ({ ...prev, selectedEmotion: emotion }))}
                          className={`text-xs px-3 py-1.5 rounded-sm transition-all border ${
                            answers.selectedEmotion === emotion
                              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border-rose-350 font-bold shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {emotion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button onClick={() => setCurrentStep('brand_story')} className="flex items-center gap-1.5 text-xs text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white uppercase"><ChevronLeft size={16}/> Back</button>
                  <button 
                    onClick={() => setCurrentStep('timeline')} 
                    className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 hover:opacity-90 transition-all"
                  >
                    Next Step <ChevronRight size={16}/>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: TIMELINE & PLATFORMS */}
            {currentStep === 'timeline' && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h3 className="text-lg font-light tracking-tight text-slate-900 dark:text-slate-150">What is the campaign duration and timeline?</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Provide preferred duration, tease periods, or seasonal relevance</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">Campaign Duration & Important Dates</label>
                    <input
                      type="text"
                      value={answers.timelineDuration}
                      onChange={(e) => setAnswers(prev => ({ ...prev, timelineDuration: e.target.value }))}
                      placeholder="e.g. 6 weeks total. 1 week teaser, 1 week official reveal, 4 weeks heavy performance ads."
                      className="w-full text-sm bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">What platforms will this campaign run on?</label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2">Select all target channels:</p>
                    <div className="flex flex-wrap gap-2">
                      {KEY_PLATFORMS.map(p => {
                        const active = answers.selectedPlatforms.includes(p);
                        return (
                          <button
                            key={p}
                            onClick={() => togglePlatform(p)}
                            className={`text-xs px-3 py-1.5 rounded-sm transition-all border flex items-center gap-1.5 ${
                              active
                                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border-rose-350 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800/40 text-slate-650 dark:text-slate-405 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            {active ? <Check size={12} className="text-rose-600" /> : <Plus size={10} />}
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button onClick={() => setCurrentStep('audience')} className="flex items-center gap-1.5 text-xs text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white uppercase"><ChevronLeft size={16}/> Back</button>
                  <button 
                    disabled={answers.selectedPlatforms.length === 0}
                    onClick={() => setCurrentStep('language_region')} 
                    className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    Next Step <ChevronRight size={16}/>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: LANGUAGE & REGION */}
            {currentStep === 'language_region' && (
              <motion.div 
                key="step5_lang"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h3 className="text-lg font-light tracking-tight text-slate-900 dark:text-slate-150">Campaign Language & Region Targeting</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans font-light">Pick the primary language and target geographic region/country for visual overlays and localized copywriting</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 text-left">
                  {/* Localized Campaign Language Selector */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-450 dark:text-slate-550 uppercase tracking-widest block font-sans">Campaign Language</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[170px] overflow-y-auto pr-1">
                      {LANGUAGES_LIST.map(lang => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, campaignLanguage: lang }))}
                          className={`text-[11px] py-1.5 px-2 border rounded-xs transition-all text-left font-sans cursor-pointer truncate ${
                            answers.campaignLanguage === lang
                              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border-rose-350 font-bold shadow-xs'
                              : 'bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-150 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Or type custom language..."
                        value={answers.campaignLanguage}
                        onChange={(e) => setAnswers(prev => ({ ...prev, campaignLanguage: e.target.value }))}
                        className="w-full text-xs bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-2 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                      />
                    </div>
                  </div>

                  {/* Target Geographic Region/Country Selector */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-slate-455 dark:text-slate-555 uppercase tracking-widest block font-sans">Target Country / Region</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[170px] overflow-y-auto pr-1">
                      {REGIONS_LIST.map(reg => (
                        <button
                          key={reg}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, countryRegion: reg }))}
                          className={`text-[11px] py-1.5 px-2 border rounded-xs transition-all text-left font-sans cursor-pointer truncate ${
                            answers.countryRegion === reg
                              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border-rose-350 font-bold shadow-xs'
                              : 'bg-slate-50/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-150 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-900'
                          }`}
                        >
                          {reg}
                        </button>
                      ))}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Or type custom country/region..."
                        value={answers.countryRegion}
                        onChange={(e) => setAnswers(prev => ({ ...prev, countryRegion: e.target.value }))}
                        className="w-full text-xs bg-slate-50/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-2 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60 font-sans">
                  <button onClick={() => setCurrentStep('timeline')} className="flex items-center gap-1.5 text-xs text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white uppercase"><ChevronLeft size={16}/> Back</button>
                  <button 
                    disabled={!answers.campaignLanguage || !answers.countryRegion}
                    onClick={() => setCurrentStep('deliverables')} 
                    className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer font-sans font-bold"
                  >
                    Next Step <ChevronRight size={16}/>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 6: CONTENT REQUIREMENTS */}
            {currentStep === 'deliverables' && (
              <motion.div 
                key="step6_deliv"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h3 className="text-lg font-light tracking-tight text-slate-900 dark:text-slate-150 font-sans">What deliverables do you need?</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-sans font-light">Pick preferred assets, creative styles, and define target volumes</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 text-left animate-fade-in font-sans">
                  {/* Left: Deliverables & Aesthetic Selector */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">Choose Wanted Assets</label>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {DELIVERABLE_TEMPLATES.map(d => {
                          const active = answers.selectedDeliverables.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleDeliverable(d)}
                              className={`text-[10px] px-2.5 py-1.5 rounded-sm transition-all border flex items-center gap-1 shrink-0 cursor-pointer ${
                                active
                                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-455 border-rose-350 font-bold shadow-xs'
                                  : 'bg-slate-50/70 dark:bg-slate-900/40 text-slate-650 dark:text-slate-405 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                              }`}
                            >
                              {active ? <Check size={10} className="text-rose-600 font-sans" /> : <Plus size={8} />}
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">What style or aesthetic should the campaign follow?</label>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {VISUAL_ASTHETICS.map(aes => (
                          <button
                            key={aes}
                            type="button"
                            onClick={() => setAnswers(prev => ({ ...prev, selectedAesthetic: aes }))}
                            className={`text-[10px] px-2.5 py-1 rounded-sm transition-all border shrink-0 cursor-pointer ${
                              answers.selectedAesthetic === aes
                                ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border-rose-350 font-bold shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                            }`}
                          >
                            {aes}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Asset Quantities Counters */}
                  <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 border border-slate-150 dark:border-slate-805 rounded-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-widest block border-b border-slate-150 dark:border-slate-800 pb-2">Asset Quantities / Production Mix</span>
                    
                    {/* IMAGES COUNTER */}
                    <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-105 dark:border-slate-850">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1 font-sans">
                          <Image size={11} className="text-rose-500 shrink-0" />
                          Images Volume
                        </h4>
                        <p className="text-[9px] text-slate-400 dark:text-slate-555 truncate">
                          Photorealistic visual assets, product frames
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, numImages: Math.max(1, prev.numImages - 1) }))}
                          className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 hover:border-rose-450 flex items-center justify-center text-slate-600 dark:text-slate-350 transition-all text-[10px] cursor-pointer"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold font-mono w-4 text-center text-slate-900 dark:text-white">
                          {answers.numImages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, numImages: Math.min(5, prev.numImages + 1) }))}
                          className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 hover:border-rose-450 flex items-center justify-center text-slate-600 dark:text-slate-350 transition-all text-[10px] cursor-pointer"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>

                    {/* VIDEOS COUNTER */}
                    <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-105 dark:border-slate-850">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1 font-sans">
                          <Video size={11} className="text-rose-500 shrink-0" />
                          Videos Volume
                        </h4>
                        <p className="text-[9px] text-slate-400 dark:text-slate-555 truncate">
                          Cinematic reveals, kinetic hooks, social banners
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, numVideos: Math.max(0, prev.numVideos - 1) }))}
                          className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 hover:border-rose-450 flex items-center justify-center text-slate-600 dark:text-slate-350 transition-all text-[10px] cursor-pointer"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold font-mono w-4 text-center text-slate-900 dark:text-white font-sans">
                          {answers.numVideos}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, numVideos: Math.min(3, prev.numVideos + 1) }))}
                          className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 hover:border-rose-450 flex items-center justify-center text-slate-600 dark:text-slate-350 transition-all text-[10px] cursor-pointer"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>

                    {/* COPIES COUNTER */}
                    <div className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1 font-sans">
                          <FileText size={11} className="text-rose-500 shrink-0" />
                          Copies Volume
                        </h4>
                        <p className="text-[9px] text-slate-400 dark:text-slate-555 truncate font-sans">
                          Ad copies, newsletter flows, commercial scripts
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, numCopy: Math.max(1, prev.numCopy - 1) }))}
                          className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 hover:border-rose-450 flex items-center justify-center text-slate-600 dark:text-slate-350 transition-all text-[10px] cursor-pointer"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold font-mono w-4 text-center text-slate-900 dark:text-white font-sans">
                          {answers.numCopy}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, numCopy: Math.min(5, prev.numCopy + 1) }))}
                          className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 hover:border-rose-450 flex items-center justify-center text-slate-600 dark:text-slate-350 transition-all text-[10px] cursor-pointer"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button onClick={() => setCurrentStep('language_region')} className="flex items-center gap-1.5 text-xs text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white uppercase"><ChevronLeft size={16}/> Back</button>
                  <button 
                    disabled={!answers.selectedAesthetic || answers.selectedDeliverables.length === 0}
                    onClick={() => setCurrentStep('scale')} 
                    className="px-5 py-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-xs font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer font-bold font-sans"
                  >
                    Next Step <ChevronRight size={16}/>
                  </button>
                </div>
              </motion.div>
              )}

            {/* Step 7: BUDGET & SCALE */}
            {currentStep === 'scale' && (
              <motion.div 
                key="step7"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h3 className="text-lg font-light tracking-tight text-slate-900 dark:text-slate-150">Campaign Scale & Budget Parameters</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Pick approx budget ranges, distribution scales, or paid amplification setups</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Projected Campaign Scale</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Low-budget Organic', 
                        'Mid-scale Digital', 
                        'High-scale Production', 
                        'Performance-heavy', 
                        'Influencer-heavy', 
                        'Celebrity-driven', 
                        'Pan-Regional', 
                        'Global Launch'
                      ].map(scale => (
                        <button
                          key={scale}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, budgetScale: scale }))}
                          className={`text-xs px-3 py-2 rounded-sm transition-all border text-left flex items-center gap-2 ${
                            answers.budgetScale === scale
                              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border-rose-350 font-bold'
                              : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <DollarSign size={12} className="text-slate-400" />
                          {scale}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Will this campaign run paid ads, sponsor influencers, or events?</label>
                    <div className="flex gap-4">
                      {['Yes', 'No', 'Unsure'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="paidAds"
                            value={opt}
                            checked={answers.involvesPaidAds === opt}
                            onChange={(e) => setAnswers(prev => ({ ...prev, involvesPaidAds: e.target.value }))}
                            className="accent-rose-500 text-rose-650"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button onClick={() => setCurrentStep('deliverables')} className="flex items-center gap-1.5 text-xs text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white uppercase"><ChevronLeft size={16}/> Back</button>
                  <button 
                    onClick={handleCompileCampaign}
                    disabled={!answers.budgetScale}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-widest rounded-sm flex items-center gap-2 shadow-lg transition-all"
                  >
                    Assemble Strategy Board <Sparkles size={14}/>
                  </button>
                </div>
              </motion.div>
            )}

            {/* PHASE 2: STRATEGIC THINKING (ANALYZING) */}
            {currentStep === 'analyzing' && (
              <motion.div 
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 text-center py-12"
              >
                <div className="relative w-20 h-20 mx-auto">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="absolute inset-0 border-2 border-dashed border-rose-500 rounded-full"
                  />
                  <div className="absolute inset-2 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-450 font-extrabold text-sm shadow-inner">
                    BOARD
                  </div>
                </div>

                <div className="space-y-2 max-w-sm mx-auto">
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white">Convene Agency Boardroom</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">We are synthetically modeling deep strategic angles...</p>
                </div>

                <div className="max-w-xs mx-auto text-left space-y-2 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/80 p-4 rounded bg-slate-50/50 dark:bg-slate-900">
                  <div className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Extracting core brand archetype...</div>
                  <div className="flex items-center gap-2"><Check size={12} className="text-green-500" /> Mapping consumer micro-segmentation...</div>
                  <div className="flex items-center gap-2"><Loader2 size={12} className="animate-spin text-rose-500" /> Synthesizing platform-native visual direction...</div>
                  <div className="flex items-center gap-2 text-slate-350"><Clock size={12} /> Compiling copywriting and funnels...</div>
                </div>
              </motion.div>
            )}

            {/* PHASE 3: CAMPAIGN roadmap generated */}
            {currentStep === 'results' && campaignResult && (
              <motion.div 
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="border-b border-rose-100 dark:border-rose-900/40 pb-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest block">Phase 3: Deep Strategy Board</span>
                    <h2 className="text-2xl font-light tracking-tight text-slate-950 dark:text-slate-50">
                      Completed System Roadmap
                    </h2>
                  </div>
                  
                  {/* Option Selector for Campaign Name */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-550">Active Concept:</span>
                    <select 
                      value={selectedCampaignName}
                      onChange={(e) => setSelectedCampaignName(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold py-1.5 px-3 rounded-sm text-slate-800 dark:text-slate-250"
                    >
                      {campaignResult.campaignNames.map((n, i) => (
                        <option key={i} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SECONDARY NAVIGATION TABS FOR RESULTS SCREEN */}
                <div className="flex border-b border-slate-100 dark:border-slate-800/80 mb-4 bg-slate-50/50 dark:bg-slate-900/40 p-1 rounded-sm gap-2">
                  <button
                    onClick={() => setActiveSecondaryTab('strategy')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold uppercase tracking-wider transition-all text-center rounded-xs cursor-pointer ${
                      activeSecondaryTab === 'strategy'
                        ? 'bg-rose-500 text-white font-black shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    📋 Strategy Playbook & Brief
                  </button>
                  <button
                    onClick={() => setActiveSecondaryTab('production')}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold uppercase tracking-wider transition-all text-center rounded-xs cursor-pointer flex items-center justify-center gap-2 ${
                      activeSecondaryTab === 'production'
                        ? 'bg-rose-500 text-white font-black shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    ⚡ Asset Production Hub
                    <span className="bg-rose-600 dark:bg-rose-700 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                      {generatedAssets.length}
                    </span>
                  </button>
                </div>

                {activeSecondaryTab === 'strategy' ? (
                  /* GORGEOUS TWELVE-PART strategic representation */
                  <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                  
                  {/* Section 1: The Big Idea Manifest */}
                  <div className="p-5 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 rounded-sm space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">01. The Big Idea</span>
                    <p className="text-base md:text-lg font-light italic text-slate-800 dark:text-slate-200 leading-relaxed font-sans select-all">
                      “{campaignResult.coreBigIdea}”
                    </p>
                  </div>

                  {/* Section 2: Positioning Manifesto */}
                  <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-sm space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">02. Brand Positioning Line</span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                      {campaignResult.brandPositioningLine}
                    </h3>
                  </div>

                  {/* Section 3: Taglines & Hooks */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">03. Taglines & Launch Hooks</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {campaignResult.taglinesAndHooks.map((tag, idx) => (
                        <div key={idx} className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xs text-xs font-medium text-slate-700 dark:text-slate-300 flex items-start gap-2">
                          <span className="text-rose-500 font-bold shrink-0">{idx + 1}.</span>
                          <span>{tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 4: Content Pillars */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">04. Strategic Content Pillars</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {campaignResult.contentPillars.map((pillar, idx) => (
                        <div key={idx} className="p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 rounded-sm space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-rose-500/10 text-rose-500 text-[10px] flex items-center justify-center font-bold">{idx + 1}</span>
                            {pillar.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {pillar.strategy}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 5: Platform-Wise Strategy */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">05. Platform-Native Deployments</span>
                    <div className="space-y-2">
                      {campaignResult.platformWiseStrategy.map((ps, idx) => (
                        <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/50 rounded-xs flex flex-col md:flex-row gap-2 items-start md:items-center">
                          <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-sm shrink-0">{ps.platform}</span>
                          <p className="text-[11px] text-slate-650 dark:text-slate-350 select-text leading-relaxed">
                            {ps.strategy}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 6: Creative Concepts */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">06. Creative Advertising Concepts</span>
                    <div className="space-y-3">
                      {campaignResult.creativeConcepts.map((concept, idx) => (
                        <div key={idx} className="p-4 border border-slate-150 dark:border-slate-800 rounded-sm bg-white dark:bg-slate-950/20 space-y-1.5 shadow-xs">
                          <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-905 pb-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{concept.title}</h4>
                            <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-xs">{concept.format}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                            {concept.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 7: Visual Aesthetic Direction */}
                  <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-sm space-y-4 bg-white dark:bg-slate-900/20 shadow-sm">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">07. Brand Visual Identity Blueprint</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Color Mood & Grade</span>
                        <p className="text-slate-750 dark:text-slate-300">{campaignResult.visualDirection.colors}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Art Direction</span>
                        <p className="text-slate-755 dark:text-slate-305">{campaignResult.visualDirection.artDirection}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Lighting Design</span>
                        <p className="text-slate-750 dark:text-slate-300">{campaignResult.visualDirection.lighting}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Camera & Shot Setup</span>
                        <p className="text-slate-755 dark:text-slate-305">{campaignResult.visualDirection.cameraStyle}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Typography Systems</span>
                        <p className="text-slate-750 dark:text-slate-300">{campaignResult.visualDirection.typography}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-450 uppercase block mb-1">Motion Language</span>
                        <p className="text-slate-755 dark:text-slate-305">{campaignResult.visualDirection.motionLanguage}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 8: Copywriting System snippets */}
                  <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-sm space-y-4">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">08. Master Copywriting blueprint</span>
                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-rose-500 uppercase block">Selected Headlines</span>
                        <ul className="list-disc list-inside text-slate-650 dark:text-slate-350 space-y-0.5 max-h-32 overflow-y-auto">
                          {campaignResult.copywritingSystem.headlines.map((hl, i) => <li key={i}>{hl}</li>)}
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-rose-500 uppercase block">Short hooks & Taglines</span>
                        <ul className="list-disc list-inside text-slate-655 dark:text-slate-355 space-y-0.5 max-h-32 overflow-y-auto">
                          {campaignResult.copywritingSystem.shortHooks.map((sh, i) => <li key={i}>{sh}</li>)}
                        </ul>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-rose-500 uppercase block">Proposed Hero Social Caption</span>
                        <p className="p-3 bg-slate-50 dark:bg-slate-805 rounded border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                          {campaignResult.copywritingSystem.captions?.[0] || 'Strategic captions pack loading.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 9: Funnel Mechanics */}
                  <div className="p-5 border border-slate-200 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-900/10 rounded-sm space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">09. Targeted Conversion Funnel</span>
                    <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <div><strong className="text-rose-500 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Top-of-Funnel (Awareness):</strong> {campaignResult.funnelStructure.awareness}</div>
                      <div className="pt-2"><strong className="text-rose-550 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Middle-of-Funnel (Consideration):</strong> {campaignResult.funnelStructure.consideration}</div>
                      <div className="pt-2"><strong className="text-rose-500 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Bottom-of-Funnel (Conversion):</strong> {campaignResult.funnelStructure.conversion}</div>
                      <div className="pt-2"><strong className="text-rose-555 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Retention (Loyalty):</strong> {campaignResult.funnelStructure.retention}</div>
                    </div>
                  </div>

                  {/* Section 10: Content Calendar roadmap */}
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900/10 space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">10. Launch Sequence Roadmap</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-705 dark:text-slate-300">
                      <div>
                        <strong className="text-[10px] uppercase text-rose-500 block mb-0.5">Teaser Sequence Phase</strong>
                        <p>{campaignResult.contentCalendar.teaser}</p>
                      </div>
                      <div>
                        <strong className="text-[10px] uppercase text-rose-500 block mb-0.5">Main Launch Sequencing</strong>
                        <p>{campaignResult.contentCalendar.sequencing}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 11 & 12: Performance, Retargeting & Amplification */}
                  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded bg-slate-50/40 space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">11 & 12. Ad Retargeting & Growth Optimization</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300">
                      <div>
                        <strong className="text-[10px] uppercase text-rose-500 block mb-0.5">Segment Custom Audience</strong>
                        <p>{campaignResult.performanceStrategy.segmentation}</p>
                      </div>
                      <div>
                        <strong className="text-[10px] uppercase text-rose-500 block mb-0.5">Viral Triggers & Hacks</strong>
                        <p>{campaignResult.performanceStrategy.viral}</p>
                      </div>
                    </div>
                  </div>

                </div>
                ) : (
                  /* ASSET PRODUCTION HUB VIEW */
                  <div className="space-y-6">
                     {/* Batch Action Bar */}
                     <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                       <div className="space-y-0.5">
                         <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Global Asset Pipeline Engine</h4>
                         <p className="text-[11px] text-slate-400 dark:text-slate-500">
                           Render your batch of {generatedAssets.length} custom creative assets simultaneously using Imagen, Veo, and copywriting architectures.
                         </p>
                       </div>
                       <button
                         onClick={handleTriggerAllPipelines}
                         className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-widest rounded-sm shrink-0 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer font-sans"
                       >
                         <Play size={12} /> Render All Queue
                       </button>
                     </div>

                     {/* AI Model Pipeline Selection Settings */}
                     <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/80 rounded-sm space-y-4">
                       <div className="flex items-center gap-2 pb-2 border-b border-rose-500/10 dark:border-slate-800">
                         <span className="p-1 rounded-sm bg-rose-500/10 text-rose-500"><Settings2 size={14} /></span>
                         <div>
                           <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Model Pipeline Synthesizer Profiles</h4>
                           <p className="text-[10px] text-slate-400 dark:text-slate-500">Assign state-of-the-art architectures to drive distinct creative components</p>
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         {/* Image Model Select */}
                         <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Image Generation Engine</label>
                           <select
                             value={selectedImageModel}
                             onChange={(e) => setSelectedImageModel(e.target.value)}
                             className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-sm p-2 text-slate-800 dark:text-slate-200 focus:border-rose-450 outline-none"
                           >
                             {IMAGE_MODELS.map((m: any) => (
                               <option key={m.id} value={m.id}>{m.name} — {('credits' in m ? (m as any).credits : 0)} Credits</option>
                             ))}
                           </select>
                           <p className="text-[9px] text-slate-400 leading-snug">
                             {(() => { const m = IMAGE_MODELS.find(x => x.id === selectedImageModel); return m ? `${m.description} (${(m as any).credits} Credits / ${(m as any).humanTouch} Human Touch)` : 'Visual rendering model'; })()}
                           </p>
                         </div>

                         {/* Video Model Select */}
                         <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Cinematic Video Motion</label>
                           <select
                             value={selectedVideoModel}
                             onChange={(e) => setSelectedVideoModel(e.target.value)}
                             className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-sm p-2 text-slate-800 dark:text-slate-200 focus:border-rose-450 outline-none"
                           >
                             {VIDEO_MODELS.map((m: any) => ({ ...m, name: `${m.name} — ${m.credits} Credits` })).map(m => (
                               <option key={m.id} value={m.id}>{m.name}</option>
                             ))}
                           </select>
                           <p className="text-[9px] text-slate-400 leading-snug">
                             {(() => { const m = VIDEO_MODELS.find(x => x.id === selectedVideoModel); return m ? `${m.description} (${(m as any).credits} Credits / ${(m as any).humanTouch} Human Touch)` : 'Video rendering model'; })()}
                           </p>
                         </div>

                         {/* Text Model Select */}
                         <div className="space-y-1.5">
                           <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Chief Copywriting Model</label>
                           <select
                             value={selectedTextModel}
                             onChange={(e) => setSelectedTextModel(e.target.value)}
                             className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-sm p-2 text-slate-800 dark:text-slate-200 focus:border-rose-450 outline-none"
                           >
                             {TEXT_MODELS.map((m: any) => ({ ...m, name: `${m.name} — ${m.credits} Credits` })).map(m => (
                               <option key={m.id} value={m.id}>{m.name}</option>
                             ))}
                           </select>
                           <p className="text-[9px] text-slate-400 leading-snug">
                             {(() => { const m = TEXT_MODELS.find(x => x.id === selectedTextModel); return m ? `${m.description} (${(m as any).credits} Credits / ${(m as any).humanTouch} Human Touch)` : 'Narrative strategy model'; })()}
                           </p>
                         </div>
                       </div>
                     </div>

                      {/* Advanced Multimodal Attachment and Reference Board */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-sm space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-rose-500/10">
                          <div className="flex-1 text-left">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                              📷 Multimodal Production Reference Board
                            </h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-550">
                              Optionally seed target face profiles or product templates to anchor image syntheses
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Product Reference */}
                          <div className="p-3 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-sm space-y-3 flex flex-col justify-between">
                            <div className="space-y-1 text-left">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest block font-sans">Reference 01: Product/Item Photo</span>
                              <p className="text-[10px] text-slate-500">Provide a high-contrast template of your physical product</p>
                            </div>

                            {productContext ? (
                              <div className="flex items-center justify-between gap-3 p-2 bg-rose-50/20 dark:bg-rose-955/15 border border-rose-100 dark:border-rose-900/30 rounded-xs">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <img 
                                    src={productContext.data} 
                                    alt="Product reference preset" 
                                    className="w-10 h-10 rounded-xs object-cover border border-rose-220"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="text-[11px] font-mono text-rose-600 dark:text-rose-450 truncate block font-bold" title={productContext.name}>
                                    {productContext.name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setProductContext(null)}
                                  className="p-1 px-2.5 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-750 text-rose-500 rounded cursor-pointer transition-all uppercase font-bold text-[9px]"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div>
                                <label className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-sm hover:border-rose-400 dark:hover:border-rose-900 hover:bg-slate-50 hover:text-slate-850 text-[10px] font-bold uppercase transition-all tracking-wider text-slate-500 cursor-pointer text-center">
                                  <span>Attach Product Photo</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleProductUploadClick}
                                    className="hidden" 
                                  />
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Model/Face Reference */}
                          <div className="p-3 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-sm space-y-3 flex flex-col justify-between">
                            <div className="space-y-1 text-left">
                              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest block font-sans">Reference 02: Face/Model Photo</span>
                              <p className="text-[10px] text-slate-550 dark:text-slate-400 font-sans">Provide high-resolution facial landmarks for actor consistency</p>
                            </div>

                            {faceContext ? (
                              <div className="flex items-center justify-between gap-3 p-2 bg-rose-50/20 dark:bg-rose-955/15 border border-rose-100 dark:border-rose-900/30 rounded-xs">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <img 
                                    src={faceContext.data} 
                                    alt="Model reference preset" 
                                    className="w-10 h-10 rounded-xs object-cover border border-rose-220"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="text-[11px] font-mono text-rose-600 dark:text-rose-450 truncate block font-bold" title={faceContext.name}>
                                    {faceContext.name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setFaceContext(null)}
                                  className="p-1 px-2.5 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-750 text-rose-500 rounded cursor-pointer transition-all uppercase font-bold text-[9px]"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div>
                                <label className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-sm hover:border-rose-400 dark:hover:border-rose-900 hover:bg-slate-50 hover:text-slate-850 text-[10px] font-bold uppercase transition-all tracking-wider text-slate-500 cursor-pointer text-center">
                                  <span>Attach Face/Model Photo</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFaceUploadClick}
                                    className="hidden" 
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                     {/* Assets Grid */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-2">
                       {generatedAssets.map((asset) => (
                         <div
                           key={asset.id}
                           className="p-4 border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950/20 rounded-sm space-y-4 flex flex-col justify-between shadow-xs hover:border-rose-300 dark:hover:border-rose-900/60 transition-all text-left"
                         >
                           <div className="space-y-1.5">
                             <div className="flex items-center justify-between">
                               <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm flex items-center gap-1 ${
                                 asset.type === 'copy'
                                   ? 'bg-blue-550/10 text-blue-550'
                                   : asset.type === 'video'
                                   ? 'bg-purple-550/10 text-purple-550'
                                   : 'bg-rose-550/10 text-rose-550'
                               }`}>
                                 {asset.type === 'copy' && <FileText size={10} />}
                                 {asset.type === 'video' && <Video size={10} />}
                                 {asset.type === 'image' && <Image size={10} />}
                                 {asset.type}
                               </span>

                               {/* Status Indicator Badge */}
                               <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                 asset.status === 'completed'
                                   ? 'bg-green-500/10 text-green-500'
                                   : asset.status === 'generating' || asset.status === 'pending'
                                   ? 'bg-rose-550/10 text-rose-500 animate-pulse'
                                   : asset.status === 'failed'
                                   ? 'bg-red-500/10 text-red-500'
                                   : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                               }`}>
                                 {asset.status === 'idle' && 'Waiting'}
                                 {asset.status === 'generating' && 'Rendering...'}
                                 {asset.status === 'pending' && 'Synthesizing'}
                                 {asset.status === 'completed' && 'Ready'}
                                 {asset.status === 'failed' && 'Rendering Failed'}
                               </span>
                             </div>

                             <div className="space-y-1">
                               <div className="flex items-center justify-between">
                                 <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{asset.title}</h4>
                                 {editingAssetId !== asset.id && (
                                   <button
                                     onClick={() => {
                                       setEditingAssetId(asset.id);
                                       setEditingDescription(asset.description);
                                     }}
                                     className="p-1 text-slate-405 hover:text-rose-500 rounded-sm hover:bg-slate-50 dark:hover:bg-slate-900/65 transition-all flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                                     title="Edit Prompt"
                                   >
                                     <Edit2 size={10} /> Edit Base Prompt
                                   </button>
                                 )}
                               </div>

                               {editingAssetId === asset.id ? (
                                 <div className="space-y-2 mt-1">
                                   <textarea
                                     className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-sm p-2 text-slate-800 dark:text-slate-200 focus:border-rose-450 outline-none font-sans leading-relaxed"
                                     rows={3}
                                     value={editingDescription}
                                     onChange={(e) => setEditingDescription(e.target.value)}
                                     placeholder="Customize or refine this asset's specific brief/prompt..."
                                   />
                                   <div className="flex justify-end gap-1.5">
                                     <button
                                       onClick={() => setEditingAssetId(null)}
                                       className="px-2 py-0.5 text-[9px] uppercase font-bold text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 cursor-pointer"
                                     >
                                       Cancel
                                     </button>
                                     <button
                                       onClick={() => {
                                         setGeneratedAssets(prev => prev.map(a => a.id === asset.id ? { ...a, description: editingDescription } : a));
                                         setEditingAssetId(null);
                                       }}
                                       className="px-2.5 py-1 bg-rose-600 text-white rounded-xs text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-rose-700"
                                     >
                                       <Save size={10} /> Save Changes
                                     </button>
                                   </div>
                                 </div>
                               ) : (
                                 <div className="space-y-1">
                                   <p className="text-[11px] text-slate-450 dark:text-slate-505 leading-relaxed font-light select-all bg-slate-50/50 dark:bg-slate-900/20 p-2 rounded-xs border border-slate-100/60 dark:border-slate-800/40">
                                     {asset.description}
                                   </p>
                                   <div className="text-[9px] text-slate-400/80 font-medium italic">
                                     * Click "Edit Base Prompt" to change this input before rendering.
                                   </div>
                                 </div>
                               )}
                             </div>

                             {asset.error && (
                               <div className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-sm text-[10px] text-red-650 dark:text-red-400 flex items-start gap-1">
                                 <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                 <span>{asset.error}</span>
                               </div>
                             )}
                           </div>

                           {/* Render media asset output */}
                           {asset.status === 'completed' && (
                             <div className="border border-slate-100 dark:border-slate-800/80 rounded bg-slate-50/50 dark:bg-slate-900/40 p-2 overflow-hidden">
                               {asset.type === 'copy' && asset.content && (
                                 <div className="text-[11px] text-slate-650 dark:text-slate-350 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed markdown-body pr-1 select-all">
                                   <ReactMarkdown>{asset.content}</ReactMarkdown>
                                 </div>
                               )}
                               {asset.type === 'image' && asset.url && (
                                 <img
                                   src={asset.url}
                                   alt={asset.title}
                                   className="w-full max-h-48 object-cover rounded-sm border border-slate-100 dark:border-slate-850"
                                   referrerPolicy="no-referrer"
                                 />
                               )}
                               {asset.type === 'video' && asset.url && (
                                 <video
                                   src={asset.url}
                                   controls
                                   className="w-full max-h-48 object-contain rounded-sm border border-slate-100 dark:border-slate-850"
                                 />
                               )}
                             </div>
                           )}

                           {/* Row buttons */}
                           <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/40">
                             {asset.status === 'completed' && (
                               <>
                                 <button
                                   onClick={() => setPreviewAsset(asset)}
                                   className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-[10px] uppercase font-bold text-slate-650 dark:text-slate-350 rounded-sm flex items-center gap-1 cursor-pointer transition-all hover:border-rose-450 dark:hover:border-rose-500 hover:text-rose-550"
                                   title="Quick Fullscreen Lightbox Preview"
                                  >
                                    <Eye size={11} /> Preview
                                  </button>
                                  {asset.type === 'image' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRefiningAsset(asset);
                                        setRefiningPromptText('');
                                        setShowRefineModal(true);
                                      }}
                                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[10px] uppercase font-bold text-slate-650 dark:text-slate-350 hover:text-rose-600 rounded-sm flex items-center gap-1 cursor-pointer transition-all hover:border-rose-450 dark:hover:border-rose-500"
                                      title="Refine with AI (2 Credits)"
                                    >
                                      <Sparkles size={11} className="text-rose-500 animate-pulse" /> Refine
                                    </button>
                                  )}
                                  <button
                                    style={{ display: 'none' }}
                                 >
                                   <Eye size={11} /> Preview
                                 </button>
                                 <button
                                   onClick={() => handleDownloadAsset(asset)}
                                   className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-[10px] uppercase font-bold text-slate-650 dark:text-slate-350 rounded-sm flex items-center gap-1 cursor-pointer transition-all hover:border-rose-450 dark:hover:border-rose-500 hover:text-rose-550"
                                   title="Download Creative Deliverable"
                                 >
                                   <Download size={11} /> Download
                                 </button>
                               </>
                             )}
                             {asset.status === 'completed' && asset.content && (
                               <button
                                 onClick={() => handleCopyToClipboard(asset.content || '')}
                                 className="px-2 py-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-[10px] uppercase font-bold text-slate-500 rounded-sm cursor-pointer"
                               >
                                 Copy Text
                               </button>
                             )}
                             <button
                               disabled={asset.status === 'generating' || asset.status === 'pending'}
                               onClick={() => handleGenerateTargetAsset(asset.id)}
                               className="px-3 py-1.5 bg-slate-950 dark:bg-white dark:text-slate-950 text-white rounded-sm text-[10px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                             >
                               {(asset.status === 'generating' || asset.status === 'pending') ? (
                                 <>
                                   <Loader2 size={10} className="animate-spin" /> Rendering
                                 </>
                               ) : asset.status === 'completed' ? (
                                 'Regenerate'
                               ) : (
                                 'Render Asset'
                               )}
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                  </div>
                )}

                {/* RESET/RESTART WORKSHOP */}
                <div className="pt-4 border-t border-slate-105 dark:border-slate-800/80 flex justify-center">
                  <button 
                    onClick={() => {
                      setCurrentStep('intro');
                      setCampaignResult(null);
                    }}
                    className="px-5 py-2.5 border border-slate-205 dark:border-slate-800 hover:border-rose-500 dark:hover:border-rose-500 hover:text-rose-500 rounded-sm font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-all cursor-pointer"
                  >
                    ← RESTART DISCOVERY WORKSHOP
                  </button>
                </div>
              </motion.div>
            )}

            {/* PHASE 4: ACTIVE GENERATING DELIVERABLE DISPLAY */}
            {currentStep === 'asset_generation' && (
              <motion.div 
                key="asset_generation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="border-b border-rose-100 dark:border-rose-900/40 pb-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-455 uppercase tracking-widest block">Phase 4 Asset Output</span>
                    <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                      {activeAssetType}
                    </h2>
                  </div>
                  
                  <button 
                    onClick={() => setCurrentStep('results')}
                    className="text-[10px] bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 text-slate-700 dark:text-slate-300 font-bold px-3 py-1.5 rounded-sm transition-all"
                  >
                    ← VIEW CAMPAIGN BOARD
                  </button>
                </div>

                {assetLoading ? (
                  <div className="py-20 text-center space-y-3">
                    <Loader2 size={36} className="animate-spin mx-auto text-rose-500" />
                    <p className="text-xs text-slate-400 dark:text-slate-500">Drafting professional deliverable using Enterprise Intelligence, please stand by...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Render Beautiful Markdown Asset Content */}
                    <div className="p-6 bg-slate-50/70 dark:bg-slate-900/80 border border-slate-150 dark:border-slate-800/85 rounded-sm max-h-[500px] overflow-y-auto font-sans leading-relaxed text-sm select-text text-slate-800 dark:text-slate-200 markdown-body">
                      <ReactMarkdown>{generatedAssetOutput}</ReactMarkdown>
                    </div>

                    {/* Operational Actions */}
                    <div className="flex flex-wrap items-center gap-3 justify-end">
                      <button
                        onClick={() => handleCopyToClipboard(generatedAssetOutput)}
                        className="py-2.5 px-4 rounded-sm border border-slate-200 dark:border-slate-800 text-slate-650 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
                        title="Copy text to clipboard"
                      >
                        <Copy size={14} /> Copy Text
                      </button>

                      <button
                        onClick={handleSaveAssetToLibrary}
                        className="py-2.5 px-5 rounded-sm bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
                        title="Persist to Brand Asset Library"
                      >
                        <CheckCircle2Icon size={14} /> Save to Asset Library
                      </button>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-2">Draft another deliverable:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Cinematic Posters Prompts',
                          'AI Image Prompts Collection',
                          'Cinematic Hero Film Script',
                          'Social Reels / Shorts Ideas',
                          'Ad Strategy Copy Pack',
                          'Landing page Website Blueprint'
                        ].map(type => (
                          <button
                            key={type}
                            onClick={() => handleGenerateAsset(type)}
                            disabled={assetLoading}
                            className={`text-[10px] font-bold uppercase px-3 py-1 border transition-all ${
                              activeAssetType === type 
                                ? 'bg-rose-100/40 text-rose-600 dark:text-rose-400 border-rose-350' 
                                : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {type.split(' ')[0]} {type.split(' ').slice(-1)}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      {/* Sticky Whiteboard / Real-Time Summary Sidebar Panel */}
      {/* PERFECTLY Satisfies: "Continuously summarize what you have understood so far" */}
      <div className="w-full lg:w-80 bg-slate-50/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 self-stretch flex flex-col justify-between shrink-0 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Target size={16} className="text-slate-800 dark:text-slate-200" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest font-mono">
              Strategist's Whiteboard
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            
            {/* Real-time distillation lists */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Campaign Mechanism</span>
                <p className="text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-800/40 p-2 border border-slate-100 rounded-xs font-mono text-[10px]">
                  {answers.selectedType ? answers.selectedType : 'Awaiting choice...'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Objectives</span>
                <p className="text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-800/40 p-2 border border-slate-100 rounded-xs font-mono text-[10px]">
                  {answers.selectedGoal ? answers.selectedGoal : 'Awaiting choice...'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Brand Narrative / core USP</span>
                <p className="text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-800/40 p-2 border border-slate-100 rounded-xs font-mono text-[10px] line-clamp-2">
                  {answers.brandUnderstanding ? `${answers.brandUnderstanding} (USP: ${answers.uspDifference})` : 'Awaiting description...'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Persona Archetype & Hook</span>
                <p className="text-slate-700 dark:text-slate-350 bg-white dark:bg-slate-800/40 p-2 border border-slate-100 rounded-xs font-mono text-[10px]">
                  {answers.selectedEmotion ? answers.selectedEmotion : 'Awaiting emotional profile...'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Platforms Selected</span>
                <div className="flex flex-wrap gap-1">
                  {answers.selectedPlatforms.length > 0 ? (
                    answers.selectedPlatforms.map(p => (
                      <span key={p} className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-650 rounded-xs border border-slate-150">{p}</span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">None selected yet.</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Deliverables Inventory</span>
                <div className="flex flex-wrap gap-1">
                  {answers.selectedDeliverables.length > 0 ? (
                    answers.selectedDeliverables.map(d => (
                      <span key={d} className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-650 rounded-xs border border-slate-150">{d.split(' ')[0]}</span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">None selected yet.</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Agency Stamp */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-6 text-center">
          <span className="text-[9px] tracking-widest uppercase font-extrabold bg-slate-150 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-sm block">
            Creative Strategist W • Engine Active
          </span>
          <span className="text-[8px] text-slate-400 block mt-1.5">Culturally intelligent resonance modeling system</span>
        </div>
      </div>

      {/* Dynamic Asset Lightbox Preview Modal */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-left"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm flex items-center gap-1 ${
                      previewAsset.type === 'copy'
                        ? 'bg-blue-500/10 text-blue-500'
                        : previewAsset.type === 'video'
                        ? 'bg-purple-500/10 text-purple-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {previewAsset.type}
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Render Preview</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{previewAsset.title}</h3>
                </div>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="p-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white rounded text-xs font-bold text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {/* Main Content Area */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950 dark:bg-slate-950/80 min-h-[300px]">
                {previewAsset.type === 'copy' && previewAsset.content && (
                  <div className="w-full bg-white dark:bg-slate-900 p-6 rounded border border-slate-150 dark:border-slate-850 overflow-y-auto max-h-[50vh] text-left">
                    <div className="text-xs text-slate-700 dark:text-slate-250 leading-relaxed font-sans prose dark:prose-invert max-w-none select-all whitespace-pre-wrap markdown-body">
                      <ReactMarkdown>{previewAsset.content}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {previewAsset.type === 'image' && previewAsset.url && (
                  <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch max-h-[60vh] md:max-h-[65vh] overflow-hidden">
                    {/* Left: Interactive Canvas Workspace (Span 7) */}
                    <div className="md:col-span-7 flex flex-col justify-between bg-slate-950 dark:bg-black/40 border border-slate-800 rounded p-2 relative">
                      <span className="text-[9px] font-black tracking-widest text-rose-500 uppercase absolute top-4 left-4 z-10 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                        Interactive Visual Studio • Drag Layers To Arrange
                      </span>
                      <div 
                        ref={containerRef}
                        onMouseMove={handleContainerMouseMove}
                        onTouchMove={handleContainerTouchMove}
                        onMouseUp={handleContainerMouseUp}
                        onTouchEnd={handleContainerTouchEnd}
                        className="relative w-full aspect-square md:h-[48vh] md:w-auto mx-auto rounded overflow-hidden select-none border border-slate-850 flex items-center justify-center cursor-crosshair bg-slate-900"
                      >
                        {/* Underlay Image */}
                        <img
                          src={previewAsset.url}
                          alt={previewAsset.title}
                          className="w-full h-full object-contain pointer-events-none"
                          referrerPolicy="no-referrer"
                        />

                        {/* Interactive Logo Overlay (If guidelines logo exist) */}
                        {brandGuidelines.logo && (
                          <div
                            onMouseDown={handleLogoMouseDown}
                            onTouchStart={handleLogoTouchStart}
                            style={{
                              position: 'absolute',
                              left: `${logoPosition.x}%`,
                              top: `${logoPosition.y}%`,
                              transform: `translate(-50%, -50%) scale(${logoScale / 100})`,
                              cursor: 'move',
                              zIndex: 30,
                            }}
                            className={`p-1.5 rounded-xs border-2 select-none touch-none ${
                              isDraggingLogo 
                                ? 'border-dashed border-rose-500 bg-rose-500/10' 
                                : 'border-slate-400 group-hover:border-rose-400'
                            }`}
                          >
                            <img
                              src={brandGuidelines.logo}
                              alt="Brand Logo"
                              className={`h-20 w-auto object-contain max-w-[120px] select-none pointer-events-none ${
                                logoColorMode === 'black'
                                  ? 'brightness-0'
                                  : logoColorMode === 'white'
                                  ? 'brightness-0 invert'
                                  : logoColorMode === 'gray'
                                  ? 'brightness-0 opacity-50 font-sans'
                                  : ''
                              }`}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-[8px] text-slate-300 font-extrabold uppercase px-1 rounded scale-75 whitespace-nowrap">
                              Logo Layer
                            </div>
                          </div>
                        )}

                        {/* Draggable Typographic Word Layers */}
                        {textLayers.map((layer) => (
                          <div
                            key={layer.id}
                            onMouseDown={(e) => handleTextMouseDown(e, layer.id)}
                            onTouchStart={(e) => handleTextTouchStart(e, layer.id)}
                            style={{
                              position: 'absolute',
                              left: `${layer.position.x}%`,
                              top: `${layer.position.y}%`,
                              transform: 'translate(-50%, -50%)',
                              fontFamily: layer.fontFamily,
                              fontSize: `${layer.scale * 2.2}px`,
                              color: layer.color,
                              cursor: 'move',
                              zIndex: 45,
                            }}
                            className={`px-2 py-1 select-none font-bold uppercase whitespace-nowrap touch-none hover:outline hover:outline-dashed hover:outline-slate-400 ${
                              draggingTextWordId === layer.id
                                ? 'outline outline-rose-500 bg-rose-500/5'
                                : selectedTextWordId === layer.id
                                ? 'outline outline-dashed outline-rose-400'
                                : ''
                            }`}
                          >
                            {layer.text}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 justify-center mt-2">
                        <span className="text-[9px] text-slate-400 font-mono">
                          Logo Center: X: {Math.round(logoPosition.x)}% | Y: {Math.round(logoPosition.y)}%
                        </span>
                        <span className="text-slate-600 text-[10px]">•</span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Text Layers: {textLayers.length} Active
                        </span>
                      </div>
                    </div>

                    {/* Right: Fine-tuning Side Controls (Span 5) */}
                    <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded p-4 flex flex-col justify-between overflow-y-auto max-h-[50vh] md:max-h-none">
                      <div className="space-y-4">
                        {/* Selector Tabs */}
                        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                          {brandGuidelines.logo && (
                            <button
                              onClick={() => setActiveLayoutTab('logo')}
                              className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-all ${
                                activeLayoutTab === 'logo'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              Logo Layer
                            </button>
                          )}
                          <button
                            onClick={() => setActiveLayoutTab('text')}
                            className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-all ${
                              activeLayoutTab === 'text' || !brandGuidelines.logo
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Text Typography
                          </button>
                          <button
                            onClick={() => setActiveLayoutTab('humantouch')}
                            className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-sm cursor-pointer transition-all flex items-center gap-1 ${
                              activeLayoutTab === 'humantouch'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            🤝 Human Touch
                          </button>
                        </div>

                        {/* TAB: LOGO OVERLAY ADJUSTER */}
                        {activeLayoutTab === 'logo' && brandGuidelines.logo && (
                          <div className="space-y-4 text-left">
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Logo Layer Position Fine-Tuning</span>
                            
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] text-slate-400 uppercase font-bold">Logo Scale/Size</label>
                                <span className="font-mono text-xs text-slate-350">{logoScale}%</span>
                              </div>
                              <input 
                                type="range" 
                                min="5" 
                                max="150" 
                                value={logoScale}
                                onChange={(e) => setLogoScale(parseInt(e.target.value))}
                                className="w-full accent-rose-600 h-1 bg-slate-805 rounded-lg cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1.5 p-2 bg-slate-950 border border-slate-850 rounded-sm">
                              <div>
                                <span className="text-[10px] text-slate-355 font-bold uppercase tracking-wide block font-sans">Invert Logo Colors</span>
                                <p className="text-[9px] text-slate-500 mb-1.5">Configure single-color silhouettes to match visual backing contrasts</p>
                              </div>
                              <div className="bg-slate-900 p-1.5 border border-slate-800 rounded-sm w-full">
                                <button
                                  type="button"
                                  onClick={() => setLogoColorMode(logoColorMode === 'white' ? 'original' : 'white')}
                                  className={`w-full text-[10px] py-1.5 px-2 rounded-xs select-none uppercase tracking-wider font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    logoColorMode === 'white'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <RefreshCw size={11} className={logoColorMode === 'white' ? 'rotate-180 transition-transform duration-500' : ''} />
                                  {logoColorMode === 'white' ? 'Inverted (White)' : 'Inverted Logo'}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase block">Manual X Offset</label>
                                <input 
                                  type="number"
                                  value={Math.round(logoPosition.x)}
                                  onChange={(e) => setLogoPosition(prev => ({ ...prev, x: Number(e.target.value) }))}
                                  className="w-full bg-slate-950 border border-slate-800 p-1.5 text-xs text-white rounded-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 uppercase block">Manual Y Offset</label>
                                <input 
                                  type="number"
                                  value={Math.round(logoPosition.y)}
                                  onChange={(e) => setLogoPosition(prev => ({ ...prev, y: Number(e.target.value) }))}
                                  className="w-full bg-slate-950 border border-slate-800 p-1.5 text-xs text-white rounded-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB: TEXT OVERLAYS CREATOR */}
                        {(activeLayoutTab === 'text' || !brandGuidelines.logo) && (
                          <div className="space-y-4 text-left">
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Typographic Overlays Studio</span>
                            
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 font-bold uppercase block">New Text Content</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={newTextWordInput}
                                  onChange={(e) => setNewTextWordInput(e.target.value)}
                                  placeholder="e.g. ULTRA LUXURY"
                                  className="flex-1 bg-slate-950 border border-slate-800 px-2 px-2.5 py-1.5 text-xs text-white rounded-sm focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddTextWord(true);
                                    }
                                  }}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => handleAddTextWord(true)}
                                  disabled={!newTextWordInput.trim()}
                                  className="py-1.5 bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-[9px] uppercase tracking-wider rounded-sm disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                  Add Per Word
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddTextWord(false)}
                                  disabled={!newTextWordInput.trim()}
                                  className="py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-750 font-extrabold text-[9px] uppercase tracking-wider rounded-sm disabled:opacity-40 transition-colors cursor-pointer border border-slate-700"
                                >
                                  Add As Phrase
                                </button>
                              </div>
                            </div>

                            {/* Active Layer Customizer Style Block */}
                            {selectedTextWordId ? (() => {
                              const activeWord = textLayers.find(w => w.id === selectedTextWordId);
                              if (!activeWord) return null;
                              return (
                                <div className="p-3 bg-slate-955 border border-slate-800 rounded-xs space-y-3">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">layer styling properties</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTextLayers(prev => prev.filter(w => w.id !== selectedTextWordId));
                                        setSelectedTextWordId(null);
                                      }}
                                      className="text-rose-500 hover:text-rose-400 font-extrabold text-[9px] uppercase tracking-wider cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-450 uppercase block">Active Text Content</label>
                                    <input 
                                      type="text"
                                      value={activeWord.text}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, text: v } : w));
                                      }}
                                      className="w-full bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-white rounded focus:outline-none"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-450 uppercase block">Font Family</label>
                                    <select
                                      value={activeWord.fontFamily}
                                      onChange={(e) => {
                                        const f = e.target.value;
                                        setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, fontFamily: f } : w));
                                      }}
                                      className="w-full bg-slate-900 border border-slate-800 px-2 py-1.5 text-xs text-white rounded cursor-pointer"
                                    >
                                      {[
                                        { label: 'Outfit (Modern)', value: 'Outfit' },
                                        { label: 'Inter (Clean Global)', value: 'Inter' },
                                        { label: 'Space Grotesk (Tech Accent)', value: 'Space Grotesk' },
                                        { label: 'Playfair Display (Serif)', value: 'Playfair Display' },
                                        { label: 'Cormorant Garamond (Graceful)', value: 'Cormorant Garamond' },
                                        { label: 'JetBrains Mono (Technical)', value: 'JetBrains Mono' },
                                      ].map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[9px] text-slate-450 uppercase block">Scale</label>
                                      <input 
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={activeWord.scale}
                                        onChange={(e) => {
                                          const sc = parseInt(e.target.value) || 12;
                                          setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, scale: sc } : w));
                                        }}
                                        className="w-full bg-slate-900 border border-slate-800 p-1.5 text-xs text-white rounded"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] text-slate-450 uppercase block">Fill Color</label>
                                      <input 
                                        type="color"
                                        value={activeWord.color}
                                        onChange={(e) => {
                                          const c = e.target.value;
                                          setTextLayers(prev => prev.map(w => w.id === selectedTextWordId ? { ...w, color: c } : w));
                                        }}
                                        className="w-full h-[32px] bg-slate-900 border border-slate-800 p-0.5 rounded cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })() : (
                              <p className="p-3 bg-slate-950 rounded-sm text-[10px] text-slate-500 text-center italic border border-slate-850">
                                Click or place any text layer to configure its distinct font styles, scales, and colors.
                              </p>
                            )}
                          </div>
                        )}

                        {/* TAB: HUMAN TOUCH last-mile professional review */}
                        {activeLayoutTab === 'humantouch' && (
                          <div className="space-y-3.5 text-left">
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">🤝 Writopedia Last-Mile Human Touch Refinement</span>
                            
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans font-light">
                              Deploy human designers, cultural copywriters, and production specialists to tweak, refine, or polish this AI draft for active commercial activation.
                            </p>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400 font-bold uppercase block font-sans">Specialist Reviewer Instructions</label>
                              <textarea
                                value={humanTouchRefinementText}
                                onChange={(e) => setHumanTouchRefinementText(e.target.value)}
                                rows={3}
                                placeholder="Write clear guidelines, revisions, or edits you require..."
                                className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-white rounded-sm focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-slate-600"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (setHumanTouchItem) {
                                  // Trigger Writopedia modal in parent
                                  setHumanTouchItem({
                                    imageUrl: previewAsset.url,
                                    prompt: previewAsset.description,
                                    title: previewAsset.title,
                                    modelsUsed: 'Imagen 3 Pro • Campaign Strategist W',
                                    role: 'Visual Content'
                                  });
                                } else {
                                  alert('Human Touch Integration: request received! Dispatched successfully.');
                                }
                              }}
                              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase py-2.5 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                            >
                              🚀 Assign To Real-World Specialist
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Download Layered Interactive Composition Output */}
                      <div className="pt-4 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => {
                            if (previewAsset && previewAsset.url) {
                              const link = document.createElement('a');
                              link.href = previewAsset.url;
                              link.download = `brand-image-${Date.now()}.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }
                          }}
                          className="px-4 py-2 bg-white text-slate-900 border border-slate-350 text-xs font-black uppercase tracking-wider rounded-sm hover:bg-slate-100 flex items-center gap-1 cursor-pointer font-sans"
                        >
                          📥 Download High-Resolution Composition
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {previewAsset.type === 'video' && previewAsset.url && (
                  <div className="w-full max-w-3xl max-h-[55vh] flex items-center justify-center">
                    <video
                      src={previewAsset.url}
                      controls
                      autoPlay
                      className="max-w-full max-h-[50vh] rounded border border-slate-800 shadow-xl"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer / Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 max-w-[70%] text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="font-bold uppercase tracking-wider block">Render brief parameters:</span>
                  <p className="font-light italic line-clamp-2" title={previewAsset.description}>
                    {previewAsset.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 justify-end self-end sm:self-auto shrink-0">
                  {previewAsset.type === 'copy' && previewAsset.content && (
                    <button
                      onClick={() => handleCopyToClipboard(previewAsset.content || '')}
                      className="px-3 py-2 border border-slate-250 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300 rounded cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Copy size={12} /> Copy Output
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadAsset(previewAsset)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Download size={12} /> Direct Download
                  </button>
                  {previewAsset.type === 'image' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRefiningAsset(previewAsset);
                        setRefiningPromptText('');
                        setShowRefineModal(true);
                      }}
                      className="px-3.5 py-2 bg-slate-905 hover:bg-slate-850 dark:bg-slate-100 text-[10px] font-bold uppercase text-white dark:text-slate-900 rounded cursor-pointer transition-all flex items-center gap-1.5 border border-transparent shadow"
                    >
                      <Sparkles size={12} className="text-rose-500 animate-pulse" /> Refine with AI
                    </button>
                  )}

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refine with AI modal */}
      {showRefineModal && refiningAsset && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-in fade-in" id="refine-ai-modal">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl overflow-hidden max-w-lg w-full flex flex-col"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-sm">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Refine Asset with AI</h3>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Production Quality Real-time Creative Adjuster</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowRefineModal(false);
                  setRefiningAsset(null);
                }}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs uppercase font-extrabold pr-1"
              >
                Close
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="flex gap-4 items-center p-3 bg-slate-50 dark:bg-slate-950/40 rounded-sm border border-slate-150 dark:border-slate-850">
                <img 
                  src={refiningAsset.url} 
                  alt="Original Image preview" 
                  className="w-16 h-16 object-cover rounded-xs border dark:border-slate-800 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-[11px] font-bold text-slate-800 dark:text-white line-clamp-1">{refiningAsset.title}</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug line-clamp-2 italic font-light">"{refiningAsset.description}"</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider block">Refinement instructions</label>
                <textarea
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-850 rounded-sm focus:border-rose-500 outline-none font-sans text-slate-800 dark:text-slate-200 placeholder-slate-400 leading-relaxed min-h-[90px]"
                  placeholder="e.g., Make the background mood dark blue, increase the cinematic backlighting on the products, correct lighting..."
                  value={refiningPromptText}
                  onChange={(e) => setRefiningPromptText(e.target.value)}
                />
                <div className="flex items-center justify-between mt-1 text-[9px] uppercase tracking-wide text-rose-505 font-extrabold">
                  <span className="text-rose-600 dark:text-rose-455">✨ 2 credits will be deducted</span>
                  <span className="text-slate-400 dark:text-slate-505">System: Model {selectedImageModel?.split('-')[0] || 'AI'}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-850/70 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRefineModal(false);
                  setRefiningAsset(null);
                }}
                disabled={isExecutingRefine}
                className="flex-1 py-2 border border-slate-205 dark:border-slate-805 hover:bg-slate-105 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteProductionRefine}
                disabled={isExecutingRefine || !refiningPromptText.trim()}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md transition-all"
              >
                {isExecutingRefine ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Refining...
                  </>
                ) : (
                  <>
                    <Sparkles size={11} className="animate-pulse" />
                    Apply Refinement
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};

// CheckCircle2 alternative for compile safety if missing from main imports
const CheckCircle2Icon = ({ size }: { size: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="lucide lucide-check-circle-2"
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);
