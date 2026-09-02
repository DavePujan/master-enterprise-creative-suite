import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Layers, 
  Upload, 
  X, 
  Check, 
  Loader2, 
  Play, 
  Download, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  ImageIcon,
  ShoppingBag,
  Zap,
  Sliders,
  FileCode,
  Globe,
  Plus,
  HelpCircle,
  Lock,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type BrandGuidelines, generateFastPrompt, resizeImageIfNeeded } from '../../../../services/geminiService.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db, useAuth } from '../../../../lib/firebase.js';
import { doc, setDoc } from 'firebase/firestore';
import { compressBase64Image } from '../../../../lib/utils.js';

interface AssetDetail {
  title: string;
  role: string;
  description: string;
  prompt: string;
  imageUrl?: string;
  isFallback?: boolean;
  warning?: string;
  error?: string;
  rendering?: boolean;
}

interface CampaignData {
  campaign_title: string;
  aesthetic: string;
  assets: {
    Hero: AssetDetail;
    Closeup: AssetDetail;
    Lifestyle: AssetDetail;
    Offer: AssetDetail;
    Alternate: AssetDetail;
  };
}

interface CampaignDeckWorkspaceProps {
  brandGuidelines: BrandGuidelines;
  productContext: { id: string; name: string; data: string } | null;
  setProductContext: React.Dispatch<React.SetStateAction<{ id: string; name: string; data: string } | null>>;
  faceContext: { id: string; name: string; data: string } | null;
  setFaceContext: React.Dispatch<React.SetStateAction<{ id: string; name: string; data: string } | null>>;
  onSaveCampaignAsset: (name: string, data: string, type: 'image' | 'doc') => void;
  onSaveHistory: (res: any, gemId: string, prompt: string) => void;
  currentActiveResult?: any;
  onClearActiveResult?: () => void;
}

export function CampaignDeckWorkspace({
  brandGuidelines,
  productContext,
  setProductContext,
  faceContext,
  setFaceContext,
  onSaveCampaignAsset,
  onSaveHistory,
  currentActiveResult,
  onClearActiveResult
}: CampaignDeckWorkspaceProps) {
  
  // Local state properties
  const [step, setStep] = useState<'setup' | 'generating' | 'deck'>(
    currentActiveResult && currentActiveResult.type === 'campaign-deck' ? 'deck' : 'setup'
  );
  
  const [concept, setConcept] = useState('');
  const [commerceMode, setCommerceMode] = useState<'e-commerce' | 'quick-commerce'>('e-commerce');
  const [engine, setEngine] = useState<'openai-gpt-image-2' | 'default'>('openai-gpt-image-2');
  const [customFalKey, setCustomFalKey] = useState(() => localStorage.getItem('FAL_API_KEY') || '');
  
  // Brand override logo state
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [customLogoName, setCustomLogoName] = useState<string>('');

  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Unified campaign data
  const [campaign, setCampaign] = useState<CampaignData | null>(
    currentActiveResult && currentActiveResult.type === 'campaign-deck' ? currentActiveResult.data : null
  );

  // Asset individual status tracking
  const [assetStatuses, setAssetStatuses] = useState<{
    Hero: 'idle' | 'generating' | 'success' | 'failed';
    Closeup: 'idle' | 'generating' | 'success' | 'failed';
    Lifestyle: 'idle' | 'generating' | 'success' | 'failed';
    Offer: 'idle' | 'generating' | 'success' | 'failed';
    Alternate: 'idle' | 'generating' | 'success' | 'failed';
  }>({
    Hero: 'idle',
    Closeup: 'idle',
    Lifestyle: 'idle',
    Offer: 'idle',
    Alternate: 'idle'
  });

  // Refinement overlay state
  const [refinementRole, setRefinementRole] = useState<keyof CampaignData['assets'] | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Export progress states
  const [isZipping, setIsZipping] = useState(false);

  // Human Touch state variables for professional Writopedia assignments
  const { user } = useAuth();
  const [humanTouchItem, setHumanTouchItem] = useState<{
    title: string;
    prompt: string;
    imageUrl: string;
    role: string;
    modelsUsed: string;
  } | null>(null);
  const [humanTouchComment, setHumanTouchComment] = useState('');
  const [isHumanTouchSubmitting, setIsHumanTouchSubmitting] = useState(false);
  const [humanTouchSuccessMsg, setHumanTouchSuccessMsg] = useState<string | null>(null);

  const handleSubmitHumanTouch = async () => {
    if (!humanTouchItem || !humanTouchComment.trim()) return;
    setIsHumanTouchSubmitting(true);
    setHumanTouchSuccessMsg(null);
    try {
      // Compress legacy high-resolution base64 data URLs to safe web limits (under 100KB)
      const compressedImageUrl = await compressBase64Image(humanTouchItem.imageUrl);

      const res = await fetch('/api/human-touch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          originalPrompt: humanTouchItem.prompt,
          assetType: 'image',
          assetUrl: compressedImageUrl,
          modelsUsed: humanTouchItem.modelsUsed,
          userComment: humanTouchComment,
          emailReceipt: 'business@writopedia.com'
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.statusText}`);
      }

      const resJson = await res.json();

      if (user && user.uid !== "offline-guest-99") {
        const requestId = Math.random().toString(36).substring(7);
        // User-specific collection
        await setDoc(doc(db, 'users', user.uid, 'humanTouchRequests', requestId), {
          assetType: 'image',
          assetUrl: compressedImageUrl,
          originalPrompt: humanTouchItem.prompt,
          modelsUsed: humanTouchItem.modelsUsed,
          userComment: humanTouchComment,
          emailReceipt: 'business@writopedia.com',
          status: 'pending',
          timestamp: Date.now()
        });

        // Global collection
        await setDoc(doc(db, 'humanTouchRequests', requestId), {
          assetType: 'image',
          assetUrl: compressedImageUrl,
          originalPrompt: humanTouchItem.prompt,
          modelsUsed: humanTouchItem.modelsUsed,
          userComment: humanTouchComment,
          emailReceipt: 'business@writopedia.com',
          status: 'pending',
          timestamp: Date.now(),
          userId: user.uid,
          userEmail: user.email || 'guest@creativesuite.local'
        });
      }

      setHumanTouchSuccessMsg(resJson.message || "Submitted successfully!");
    } catch (err: any) {
      console.error(err);
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsHumanTouchSubmitting(false);
    }
  };

  // Track key saves locally
  useEffect(() => {
    localStorage.setItem('FAL_API_KEY', customFalKey);
  }, [customFalKey]);

  // Handle incoming active campaign loads from past history
  useEffect(() => {
    if (currentActiveResult && currentActiveResult.type === 'campaign-deck') {
      setCampaign(currentActiveResult.data);
      setConcept(currentActiveResult.concept || '');
      setCommerceMode(currentActiveResult.commerceMode || 'e-commerce');
      setEngine(currentActiveResult.engine || 'openai-gpt-image-2');
      setStep('deck');
    }
  }, [currentActiveResult]);

  // Generate visual concept description with AI
  const handleAutoWriteConcept = async () => {
    try {
      setIsGeneratingConcept(true);
      setGeneralError(null);
      const randomPrompt = await generateFastPrompt(
        'campaign-concept',
        brandGuidelines.name,
        undefined,
        undefined,
        !!productContext,
        !!faceContext,
        brandGuidelines
      );
      setConcept(randomPrompt);
    } catch (err: any) {
      console.error(err);
      setGeneralError("Failed to trigger suggestion assistant.");
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  // Launch the campaign execution logic
  const handleGenerateCampaign = async () => {
    if (!concept.trim()) {
      setGeneralError("Please supply a product concept description to configure the campaign deck.");
      return;
    }

    setGeneralError(null);
    setStep('generating');
    
    // Reset statuses
    setAssetStatuses({
      Hero: 'generating',
      Closeup: 'generating',
      Lifestyle: 'generating',
      Offer: 'generating',
      Alternate: 'generating'
    });

    try {
      // Step 1: Request 5 cohesive prompts from our server endpoint
      const promptRes = await fetch("/api/campaign/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: concept,
          commerceMode: commerceMode,
          guidelines: brandGuidelines,
          referenceContexts: {
            hasProduct: !!productContext,
            hasFace: !!faceContext,
            hasLogo: !!customLogo || !!brandGuidelines.logo
          }
        })
      });

      if (!promptRes.ok) {
        const errPayload = await promptRes.text();
        throw new Error(`Cohesive planning process failed: ${errPayload}`);
      }

      const campaignBrief: CampaignData = await promptRes.json();
      setCampaign(campaignBrief);

      // Save initial briefing outline to campaign state
      const roles: (keyof CampaignData['assets'])[] = ['Hero', 'Closeup', 'Lifestyle', 'Offer', 'Alternate'];
      
      // Step 2: Spawn parallel async render queries to the rendering system
      const renderPromises = roles.map(async (role) => {
        const item = campaignBrief.assets[role];
        
        try {
          const renderRes = await fetch("/api/campaign/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: item.prompt,
              size: role === 'Hero' ? '16:9' : (role === 'Lifestyle' ? '3:4' : '1:1'),
              engine: engine,
              falKey: customFalKey,
              guidelines: brandGuidelines
            })
          });

          if (!renderRes.ok) throw new Error("Network rendering error");
          const renderData = await renderRes.json();

          // Save completed asset images individually to global assets
          // Call proxy to get real persistent cloud links if we uploaded to storage inside express
          onSaveCampaignAsset(
            `${role} Asset - ${campaignBrief.campaign_title}`,
            renderData.url,
            'image'
          );

          setCampaign(prev => {
            if (!prev) return prev;
            const updatedAssets = { ...prev.assets };
            updatedAssets[role] = {
              ...updatedAssets[role],
              imageUrl: renderData.url,
              isFallback: renderData.isFallback,
              warning: renderData.warning,
              rendering: false
            };
            return { ...prev, assets: updatedAssets };
          });

          setAssetStatuses(prev => ({ ...prev, [role]: 'success' }));
        } catch (err: any) {
          console.error(`Asset rendering error [${role}]:`, err);
          
          setCampaign(prev => {
            if (!prev) return prev;
            const updatedAssets = { ...prev.assets };
            updatedAssets[role] = {
              ...updatedAssets[role],
              error: err.message || "Failed to render visual asset",
              rendering: false
            };
            return { ...prev, assets: updatedAssets };
          });

          setAssetStatuses(prev => ({ ...prev, [role]: 'failed' }));
        }
      });

      // Synchronize in parallel, non-blocking
      await Promise.all(renderPromises);

      // Once all assets completed, trigger parent log synchronizers
      setCampaign(currentCampaign => {
        if (currentCampaign) {
          const activeResult = {
            type: 'campaign-deck',
            concept: concept,
            commerceMode: commerceMode,
            engine: engine,
            data: currentCampaign
          };
          // Save in parental logs for persistence and automatic Firestore syncing
          onSaveHistory(
            activeResult,
            'bundles-campaigns',
            `Campaign: ${currentCampaign.campaign_title}`
          );
        }
        return currentCampaign;
      });

      setStep('deck');
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.message || "Something went wrong. Please check your credentials and connection.");
      setStep('setup');
    }
  };

  // Rewrite / Regenerate single specific card prompt
  const handleRegenerateSingleAsset = async () => {
    if (!refinementRole || !campaign) return;
    
    setIsRefining(true);
    setCampaign(prev => {
      if (!prev) return prev;
      const updated = { ...prev.assets };
      updated[refinementRole] = {
        ...updated[refinementRole],
        rendering: true,
        error: undefined
      };
      return { ...prev, assets: updated };
    });

    try {
      const renderRes = await fetch("/api/campaign/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: refinementPrompt,
          size: refinementRole === 'Hero' ? '16:9' : (refinementRole === 'Lifestyle' ? '3:4' : '1:1'),
          engine: engine,
          falKey: customFalKey,
          guidelines: brandGuidelines
        })
      });

      if (!renderRes.ok) throw new Error("Render request failed");
      const renderData = await renderRes.json();

      onSaveCampaignAsset(
        `${refinementRole} Regenerated - ${campaign.campaign_title}`,
        renderData.url,
        'image'
      );

      setCampaign(prev => {
        if (!prev) return prev;
        const updated = { ...prev.assets };
        updated[refinementRole] = {
          ...updated[refinementRole],
          prompt: refinementPrompt,
          imageUrl: renderData.url,
          isFallback: renderData.isFallback,
          warning: renderData.warning,
          rendering: false
        };
        
        // Sync history updates as well
        const updatedCampaign = { ...prev, assets: updated };
        onSaveHistory(
          {
            type: 'campaign-deck',
            concept: concept,
            commerceMode: commerceMode,
            engine: engine,
            data: updatedCampaign
          },
          'bundles-campaigns',
          `Campaign: ${updatedCampaign.campaign_title}`
        );

        return updatedCampaign;
      });

      setRefinementRole(null);
    } catch (err: any) {
      console.error(err);
      setCampaign(prev => {
        if (!prev) return prev;
        const updated = { ...prev.assets };
        updated[refinementRole] = {
          ...updated[refinementRole],
          error: err.message || "Failed to trigger re-render",
          rendering: false
        };
        return { ...prev, assets: updated };
      });
    } finally {
      setIsRefining(false);
    }
  };

  // Helper: fetch remote image, proxying CORS, to build zip elements
  const fetchImageAsBlob = async (url: string): Promise<Blob> => {
    // If local browser fallback data URL
    if (url.startsWith('data:')) {
      const parts = url.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      return new Blob([uInt8Array], { type: contentType });
    }

    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy fetch failed for ${url}`);
    return res.blob();
  };

  // Export full Campaign Deck as a robust zip package
  const handleExportZipBundle = async () => {
    if (!campaign) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      const folderName = `${campaign.campaign_title.toLowerCase().replace(/\s+/g, '-')}-bundle`;
      const imgFolder = zip.folder(`${folderName}/assets`);
      
      let markdownContent = `# ${campaign.campaign_title}\n\n`;
      markdownContent += `### Unified Campaign Aesthetic Spec\n> *${campaign.aesthetic}*\n\n`;
      markdownContent += `**Commerce Alignment Mode**: ${commerceMode === 'quick-commerce' ? 'Quick Commerce (Rapid read pop-framing)' : 'E-commerce Editorial'}\n`;
      markdownContent += `**Engine Pipeline**: ${engine}\n`;
      markdownContent += `**Associated Corporate Profile**: ${brandGuidelines.name}\n\n`;
      markdownContent += `---\n\n## Multi-Asset Campaign Specs\n\n`;

      const roles: (keyof CampaignData['assets'])[] = ['Hero', 'Closeup', 'Lifestyle', 'Offer', 'Alternate'];
      
      for (const role of roles) {
        const item = campaign.assets[role];
        markdownContent += `### ${role} Deliverable\n`;
        markdownContent += `- **Creative Title**: ${item.title}\n`;
        markdownContent += `- **Deliverable Role**: ${role}\n`;
        markdownContent += `- **Target Purpose**: ${item.description}\n`;
        markdownContent += `- **Visual Prompt Written**: \`\`\`${item.prompt}\`\`\`\n`;
        
        if (item.imageUrl) {
          try {
            const blob = await fetchImageAsBlob(item.imageUrl);
            const fileName = `${role.toLowerCase()}-deliverable.jpg`;
            imgFolder?.file(fileName, blob);
            markdownContent += `- **Image Export Link**: Located inside \`assets/${fileName}\`\n`;
          } catch (err) {
            console.warn(`Failed packaging ${role} image:`, err);
            markdownContent += `- **Image Export Link**: Offline fallback URL (${item.imageUrl})\n`;
          }
        } else {
          markdownContent += `- **Image Export Link**: (Render Failed / Not Completed)\n`;
        }
        markdownContent += `\n---\n\n`;
      }
      
      zip.file(`${folderName}/campaign-spec.md`, markdownContent);
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}-marketing-pack.zip`);
    } catch (err) {
      console.error("Failed executing ZIP exporter package:", err);
      alert("ZIP compilation failed. Please copy prompt text manually or check your connections.");
    } finally {
      setIsZipping(false);
    }
  };

  const activeRefLogo = customLogo || brandGuidelines.logo || '';

  return (
    <div id="campaign-deck-workspace-root" className="w-full flex flex-col gap-6 font-sans">
      
      {/* Title / Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-sm text-rose-600 dark:text-rose-400">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-xl font-light text-slate-900 dark:text-slate-100 tracking-tight">Bundles & Campaigns</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-light mt-0.5">Generate, refine, and pack cohesive multi-asset visual digital collections from a single description.</p>
          </div>
        </div>

        {step !== 'setup' && (
          <button 
            onClick={() => {
              if (onClearActiveResult) onClearActiveResult();
              setStep('setup');
            }}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-sm transition-colors cursor-pointer"
          >
            <ArrowLeft size={13} />
            BACK TO CONFIG
          </button>
        )}
      </div>

      {generalError && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-sm text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Main conditional display states */}
      <AnimatePresence mode="wait">
        
        {/* Setup configuration layer */}
        {step === 'setup' && (
          <motion.div 
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-8"
          >
            
            {/* Left Control Config Input Block */}
            <div className="lg:col-span-3 space-y-6">
              
              <div className="bg-white dark:bg-slate-900 p-6 rounded-sm border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                
                {/* Product core concept text field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 dark:text-slate-350 uppercase tracking-widest flex items-center gap-1.5">
                      <ShoppingBag size={13} className="text-rose-500" />
                      Core Concept / Product Description
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoWriteConcept}
                      disabled={isGeneratingConcept}
                      className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:opacity-85 flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wider bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-sm"
                    >
                      {isGeneratingConcept ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      Auto-Write Suggestion
                    </button>
                  </div>
                  <textarea
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="e.g., Organic Avocado Face Scrub with mineral mud base and cold-pressed olive oils..."
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 rounded-sm text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 font-light"
                  />
                  <p className="text-[10px] text-slate-400">Describe the physical attributes, natural ingredients, color theme, or texture details of your product.</p>
                </div>

                {/* Commerce Mode & Model Select Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  
                  {/* Commerce Mode options */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders size={13} />
                      Commerce Alignment Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-sm border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCommerceMode('e-commerce')}
                        className={`text-xs py-2 font-bold rounded-sm transition-all flex items-center justify-center gap-1 cursor-pointer ${commerceMode === 'e-commerce' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        E-Commerce
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommerceMode('quick-commerce')}
                        className={`text-xs py-2 font-bold rounded-sm transition-all flex items-center justify-center gap-1 cursor-pointer ${commerceMode === 'quick-commerce' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        <Zap size={12} className="text-amber-500 fill-amber-500" />
                        Quick-Comm
                      </button>
                    </div>
                  </div>

                  {/* Engine Model Select */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      Model Rendering Engine
                    </label>
                    <select
                      value={engine}
                      onChange={(e) => setEngine(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-sm text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="openai-gpt-image-2">Premium</option>
                      <option value="default">Standard</option>
                    </select>
                  </div>

                </div>



              </div>
              
              <button 
                onClick={handleGenerateCampaign}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500 dark:hover:bg-rose-600 font-bold text-sm py-4 rounded-sm tracking-widest uppercase shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Sparkles size={16} />
                Generate Cohesive 5-Asset Campaign
              </button>

            </div>

            {/* Right Reference Upload Columns */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-sm border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-950 dark:text-slate-200 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2.5 flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-rose-500" />
                  Reference Visual Contexts
                </h3>

                {/* 1. Product Context Shot Upload */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>1. Product Shot Reference</span>
                    {productContext ? <span className="text-emerald-500 font-bold text-[9px]">Custom Upload Attached</span> : <span className="text-slate-400 font-normal italic text-[9px]">Fallback to Tagline/Desc</span>}
                  </span>
                  {productContext ? (
                    <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-sm flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img src={productContext.data} alt="Product context reference" className="w-9 h-9 object-cover rounded-xs border dark:border-slate-700 bg-white" referrerPolicy="no-referrer" />
                        <span className="text-xs text-slate-600 dark:text-slate-350 truncate max-w-[120px]">{productContext.name}</span>
                      </div>
                      <button onClick={() => setProductContext(null)} className="p-1 hover:text-red-500 cursor-pointer text-slate-400"><X size={14} /></button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-200 dark:border-slate-800 p-3 h-14 rounded-sm flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer bg-slate-50/20 hover:bg-slate-50 transition-colors">
                      <Upload size={14} className="text-slate-400" />
                      <span>Attach Product Reference Photo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const resized = await resizeImageIfNeeded(reader.result as string);
                              setProductContext({
                                id: 'product-' + Date.now(),
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

                {/* 2. Character Face/Model Upload */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>2. Character / Demographic Face Model</span>
                    {faceContext ? <span className="text-emerald-500 font-bold text-[9px]">Attached ({brandGuidelines.visualEthnicityStyle})</span> : <span className="text-slate-400 font-normal italic text-[9px]">No context (uses brand ethnic style details)</span>}
                  </span>
                  {faceContext ? (
                    <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-sm flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img src={faceContext.data} alt="Character face model reference" className="w-9 h-9 object-cover rounded-xs border dark:border-slate-700 bg-white" referrerPolicy="no-referrer" />
                        <span className="text-xs text-slate-600 dark:text-slate-350 truncate max-w-[120px]">{faceContext.name}</span>
                      </div>
                      <button onClick={() => setFaceContext(null)} className="p-1 hover:text-red-500 cursor-pointer text-slate-400"><X size={14} /></button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-200 dark:border-slate-800 p-3 h-14 rounded-sm flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer bg-slate-50/20 hover:bg-slate-50 transition-colors">
                      <Upload size={14} className="text-slate-400" />
                      <span>Attach Character Face Reference</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const resized = await resizeImageIfNeeded(reader.result as string);
                              setFaceContext({
                                id: 'face-' + Date.now(),
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

                {/* 3. Corporate Brand Logo Reference Upload */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>3. Brand Logo reference</span>
                    {activeRefLogo ? (
                      <span className="text-emerald-500 font-bold text-[9px]">
                        {customLogo ? 'Custom Upload Override' : 'Guidelines Logo Fallback active'}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-[9px]">No logo (generic stylized rendering applied)</span>
                    )}
                  </span>
                  
                  {/* If we have a logo loaded (either guidelines or custom override) */}
                  {activeRefLogo ? (
                    <div className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-sm flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 border dark:border-slate-700 bg-white p-1 rounded-xs flex items-center justify-center">
                          <img src={activeRefLogo} alt="Reference logo context" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{customLogo ? (customLogoName || 'Custom Logo Override') : 'Global guidelines.logo'}</span>
                          <span className="text-[9px] text-slate-400 truncate uppercase tracking-widest">{brandGuidelines.name} Brand context</span>
                        </div>
                      </div>
                      {customLogo ? (
                        <button onClick={() => { setCustomLogo(null); setCustomLogoName(''); }} className="p-1 hover:text-red-500 cursor-pointer text-slate-400" title="Delete custom logo override">
                          <X size={14} />
                        </button>
                      ) : (
                        <label className="text-[9px] font-bold text-slate-500 border border-slate-200 dark:border-slate-700 rounded-sm p-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-widest bg-white dark:bg-transparent">
                          Override Logo
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const resized = await resizeImageIfNeeded(reader.result as string);
                                  setCustomLogo(resized);
                                  setCustomLogoName(file.name);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-200 dark:border-slate-800 p-3 h-14 rounded-sm flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer bg-slate-50/20 hover:bg-slate-50 transition-colors">
                      <Upload size={14} className="text-slate-400" />
                      <span>Attach Corporate Brand Logo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const resized = await resizeImageIfNeeded(reader.result as string);
                              setCustomLogo(resized);
                              setCustomLogoName(file.name);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-50 dark:border-slate-800/80">
                  <div className="p-3 bg-rose-50/40 dark:bg-rose-950/10 rounded-sm border border-rose-100/30 text-[10px] text-slate-550 dark:text-slate-400 leading-relaxed space-y-1.5-xs">
                    <p className="font-bold uppercase tracking-wider text-rose-600/80 dark:text-rose-400 mb-1 flex items-center gap-1">
                      <InfoDot />
                      Cultural & Geographic Controls Info
                    </p>
                    Coaxial demographics matches are automatically customized according to your active Guidelines setup:
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 font-semibold text-slate-800 dark:text-slate-350">
                      <div>Ethnicity: {brandGuidelines.visualEthnicityStyle || 'Indian'}</div>
                      <div>Location: {brandGuidelines.location || 'India'}</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </motion.div>
        )}

        {/* Parallel coordination and generation progress monitor */}
        {step === 'generating' && (
          <motion.div 
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-sm shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-rose-100 dark:border-rose-950/25 border-t-rose-600 dark:border-t-rose-400 rounded-full animate-spin flex items-center justify-center">
                  <Layers size={22} className="text-rose-600 dark:text-rose-400 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-light tracking-tight text-slate-900 dark:text-white">Parallel Visual Asset Rendering Pipeline Active</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-light max-w-lg">
                  Applying guidelines of brand <span className="font-bold text-slate-800 dark:text-slate-300">"{brandGuidelines.name}"</span>. Generating 5 complementary image models alongside campaign aesthetic specifications in parallel.
                </p>
              </div>
            </div>

            {/* Grid display of active rendering states */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {(['Hero', 'Closeup', 'Lifestyle', 'Offer', 'Alternate'] as (keyof CampaignData['assets'])[]).map((role) => {
                const status = assetStatuses[role];
                const activeAssetData = campaign?.assets?.[role];

                return (
                  <div key={role} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-sm flex flex-col gap-3 shadow-xs relative overflow-hidden h-52 justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{role} Deliverable</span>
                        {status === 'generating' && (
                          <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                            <Loader2 size={10} className="animate-spin" /> Rendering
                          </span>
                        )}
                        {status === 'success' && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-0.5"><Check size={10} /> Success</span>
                        )}
                        {status === 'failed' && (
                          <span className="text-[9px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">Failed</span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{activeAssetData?.title || `Preparing ${role}...`}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-3 font-light">{activeAssetData?.description || "Compiling campaign concept parameters to assemble a secure visual composition..."}</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 rounded-xs h-16 border border-slate-200/40 dark:border-slate-800/65 flex items-center justify-center p-2 relative group overflow-hidden">
                      {status === 'generating' ? (
                        <div className="flex flex-col items-center gap-1 animate-pulse">
                          <ImageIcon size={16} className="text-slate-400" />
                          <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Asynchronous core</span>
                        </div>
                      ) : activeAssetData?.imageUrl ? (
                        <img src={activeAssetData.imageUrl} alt={role} className="w-full h-full object-cover rounded-xs" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] text-red-500 font-semibold truncate max-w-full">Error preparing asset</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Visual cohesive campaign deck workspace loaded */}
        {step === 'deck' && campaign && (
          <motion.div 
            key="deck"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            
            {/* Unified aesthetic information header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="space-y-2 relative max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={11} /> Cohesive Collection Generated
                  </span>
                  {Object.values(campaign.assets).some(a => a.isFallback) && (
                    <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={11} /> High-Quality Fallbacks Used
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{campaign.campaign_title}</h2>
                <p className="text-slate-600 dark:text-slate-400 text-xs italic font-light leading-relaxed">
                  <span className="font-bold not-italic text-[10px] bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded-xs tracking-wider uppercase text-slate-500 mr-1.5">Creative Spec</span>
                  "{campaign.aesthetic}"
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleExportZipBundle}
                  disabled={isZipping}
                  className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 font-bold text-xs px-5 py-3 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors uppercase tracking-widest disabled:opacity-50"
                >
                  {isZipping ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Export Campaign ZIP Packet
                </button>
              </div>
            </div>

            {/* Campaign Deliverables Cards Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
              {(['Hero', 'Closeup', 'Lifestyle', 'Offer', 'Alternate'] as (keyof CampaignData['assets'])[]).map((role) => {
                const item = campaign.assets[role];
                
                return (
                  <div 
                    key={role}
                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-sm flex flex-col justify-between shadow-sm relative group hover:border-slate-350 dark:hover:border-slate-600 transition-all cursor-pointer overflow-hidden h-[340px]"
                    onClick={() => {
                      setRefinementRole(role);
                      setRefinementPrompt(item.prompt);
                    }}
                  >
                    <div>
                      {/* Thumbnail wrapper */}
                      <div className="bg-slate-50 dark:bg-slate-950 h-44 relative overflow-hidden border-b border-slate-100 dark:border-slate-800 flex items-center justify-center">
                        {item.rendering ? (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                            <Loader2 size={24} className="animate-spin text-white" />
                            <span className="text-[10px] text-white font-bold uppercase tracking-wider animate-pulse">Rendering Re-write</span>
                          </div>
                        ) : item.imageUrl ? (
                          <>
                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" referrerPolicy="no-referrer" />
                            {item.isFallback && (
                              <div className="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-sm flex items-center gap-0.5" title={item.warning}>
                                <AlertTriangle size={8} /> fallback
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                            <AlertTriangle size={24} className="text-red-500" />
                            <span className="text-[10px] text-red-500 font-bold">{item.error || 'Failed rendering'}</span>
                          </div>
                        )}

                        {/* Interactive edit hover shadow effect */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button className="bg-white text-slate-900 text-[10px] px-4 py-2 font-black rounded-sm shadow-md uppercase tracking-wider flex items-center gap-1 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                            <Sliders size={11} /> Fine-Tune Prompt
                          </button>
                        </div>
                      </div>

                      {/* Header and description tags */}
                      <div className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-bold uppercase tracking-widest ${role === 'Hero' ? 'text-rose-600' : 'text-slate-400'}`}>{role} Asset</span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {role === 'Hero' ? '16:9' : (role === 'Lifestyle' ? '3:4' : '1:1')}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.title}>{item.title}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed" title={item.description}>{item.description}</p>
                      </div>
                    </div>

                    {/* Footer export/detail strip */}
                    <div className="px-4 py-3 border-t border-slate-50 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/60 text-[9px] text-slate-400">
                      <span className="truncate max-w-[80px] font-mono shrink-0">{item.warning ? 'Flux Fallback' : 'GPT Image 2'}</span>
                      {item.imageUrl && (
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setHumanTouchItem({
                                title: item.title,
                                prompt: item.prompt,
                                imageUrl: item.imageUrl,
                                role: role,
                                modelsUsed: item.warning ? 'Flux Fallback' : 'openai/gpt-image-2'
                              });
                              setHumanTouchComment('');
                              setHumanTouchSuccessMsg(null);
                            }}
                            className="text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold uppercase tracking-wider cursor-pointer flex items-center gap-0.5"
                          >
                            <Fingerprint size={10} /> Human Touch
                          </button>
                          
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const blob = await fetchImageAsBlob(item.imageUrl!);
                                saveAs(blob, `${campaign.campaign_title.toLowerCase().replace(/\s+/g, '-')}-${role.toLowerCase()}.jpg`);
                              } catch (err) {
                                window.open(item.imageUrl, '_blank');
                              }
                            }}
                            className="text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Download size={10} /> Save
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Comprehensive details block containing full prompts */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-sm shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
                <FileCode size={13} className="text-rose-500" />
                Integrated Campaign Prompt Catalog
              </h3>
              <div className="space-y-4">
                {(['Hero', 'Closeup', 'Lifestyle', 'Offer', 'Alternate'] as (keyof CampaignData['assets'])[]).map((role) => {
                  const item = campaign.assets[role];
                  return (
                    <div key={role} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-sm border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div className="md:col-span-1 border-r border-slate-200/50 dark:border-slate-800/50 pr-4">
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">{role} Deliverable</span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">{item.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal font-light">{item.description}</p>
                      </div>
                      <div className="md:col-span-4 flex items-start justify-between gap-4">
                        <p className="text-xs text-slate-650 dark:text-slate-300 font-mono font-light bg-slate-100/50 dark:bg-slate-900/50 p-2.5 rounded-sm border border-slate-200/20 w-full select-all leading-relaxed whitespace-pre-wrap">
                          {item.prompt}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>

      {/* Modal / Dialog covering refinement prompt re-generation */}
      {refinementRole && campaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-xl w-full border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl relative overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-sm">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fine-Tune Creative Prompt</h3>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">{refinementRole} Asset - {campaign.campaign_title}</span>
                </div>
              </div>
              <button 
                onClick={() => setRefinementRole(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{campaign.assets[refinementRole].title}</h4>
                <p className="text-xs text-slate-400 font-light leading-relaxed">{campaign.assets[refinementRole].description}</p>
              </div>

              {campaign.assets[refinementRole].imageUrl && (
                <div className="h-44 w-full rounded-sm overflow-hidden bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 flex items-center justify-center relative">
                  <img src={campaign.assets[refinementRole].imageUrl} alt="Current design" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-2 right-2 bg-slate-900/60 text-white text-[9px] px-2 py-0.5 rounded-sm">Current Asset Render</div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Prompt Text Draft</label>
                <textarea
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 p-3 rounded-sm text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-950/20">
              <button
                type="button"
                onClick={() => setRefinementRole(null)}
                disabled={isRefining}
                className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold py-2.5 rounded-sm transition-colors cursor-pointer disabled:opacity-55"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleRegenerateSingleAsset}
                disabled={isRefining}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              >
                {isRefining ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Regenerate Visual Asset
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal / Dialog for Writopedia Human Touch last-mile professional review */}
      {humanTouchItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-xl w-full border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl relative overflow-hidden flex flex-col">
            
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 rounded-sm">
                  <Fingerprint size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Request Last-Mile Human Touch</h3>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider">Assigned to Professional Writopedia Agent</span>
                </div>
              </div>
              <button 
                onClick={() => setHumanTouchItem(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              {humanTouchSuccessMsg ? (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-sm text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Check size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Request Dispatched!</h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed font-light">
                    {humanTouchSuccessMsg}
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-sm border dark:border-slate-800 flex gap-4">
                    {humanTouchItem.imageUrl && (
                      <div className="w-20 h-20 shrink-0 rounded-xs overflow-hidden border dark:border-slate-800">
                        <img src={humanTouchItem.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <span className="text-[8px] font-bold text-rose-500 uppercase tracking-wider">{humanTouchItem.role} DELIVERABLE</span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{humanTouchItem.title}</h4>
                      <div className="text-[9px] flex flex-wrap gap-2 text-slate-400 pt-1">
                        <span>Original Ratio: {humanTouchItem.role === 'Hero' ? '16:9' : (humanTouchItem.role === 'Lifestyle' ? '3:4' : '1:1')}</span>
                        <span>•</span>
                        <span>Engine: <span className="font-mono text-slate-500">{humanTouchItem.modelsUsed}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-sm border border-slate-100 dark:border-slate-850">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Original Visual Prompt</label>
                    <p className="text-xs text-slate-650 dark:text-slate-300 font-mono line-clamp-3 leading-relaxed bg-white dark:bg-slate-950 px-2 py-1.5 border dark:border-slate-850 rounded-xs select-all">
                      {humanTouchItem.prompt}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reviewer Notes & Instructions</label>
                      <span className="text-[9px] text-slate-400 font-mono">* required</span>
                    </div>
                    <textarea
                      placeholder="Write descriptive directions or changes you want (e.g., 'Please correct the lighting on the product edges, make the brand logo color match our primary gold tone perfectly, and refine the model expression')..."
                      value={humanTouchComment}
                      onChange={(e) => setHumanTouchComment(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800/80 p-3 rounded-sm text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-slate-400 dark:placeholder-slate-600"
                    />
                  </div>

                  <div className="p-3 bg-amber-500/10 rounded-sm border border-amber-500/20 flex gap-2">
                    <div className="text-amber-500"><Zap size={14} className="mt-0.5" /></div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-normal font-light">
                      This request transmits the prompt, brand guidelines contexts, layout styles, live draft imagery, and your reviewer comments immediately to <span className="font-mono font-bold">business@writopedia.com</span>. Let Writopedia perfect your artwork!
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-950/20">
              <button
                type="button"
                onClick={() => setHumanTouchItem(null)}
                disabled={isHumanTouchSubmitting}
                className="flex-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold py-2.5 rounded-sm transition-colors cursor-pointer disabled:opacity-55"
              >
                {humanTouchSuccessMsg ? 'CLOSE' : 'CANCEL'}
              </button>
              {!humanTouchSuccessMsg && (
                <button
                  type="button"
                  onClick={handleSubmitHumanTouch}
                  disabled={isHumanTouchSubmitting || !humanTouchComment.trim()}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs py-2.5 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  {isHumanTouchSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Fingerprint size={13} />}
                  ASSIGN PROFESSIONAL AGENT
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Low-fi fallback icons & helpers
function InfoDot() {
  return (
    <span className="inline-flex w-3.5 h-3.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-full items-center justify-center text-[10px] font-bold font-mono">i</span>
  );
}
