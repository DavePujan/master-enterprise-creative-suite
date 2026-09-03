import React from 'react';
import { 
  Globe, 
  Volume2, 
  Sparkles, 
  Palette, 
  Image as ImageIcon, 
  X, 
  Upload, 
  Send, 
  Loader2 
} from 'lucide-react';
import type { Gem } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { generateFastPrompt } from '@web/infrastructure/ai/promptBuilders.js';
import { generateImageAutoWriteIdea } from '../services/imageAutoWriteService.js';
import { getImageModelCapabilities } from '@web/infrastructure/ai/modelRegistry.js';
import type { ImageAutoWriteIdea } from '@shared-types/imageAutoWrite.js';
import { resizeImageIfNeeded } from '@utils/image.js';
import { cn } from '@web/lib/utils.js';

export interface CreativeCommandBarProps {
  selectedGem: Gem;
  brandGuidelines: BrandGuidelines;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  selectedVoice: string;
  setSelectedVoice: (voice: string) => void;
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
  selectedModel,
  selectedPresentationTheme,
  setSelectedPresentationTheme,
  aspectRatio,
  imageStyle,
  bakeLogoOnGeneration,
  isGenerating,
  handleGenerate
}) => {
  const [activeIdeaPreview, setActiveIdeaPreview] = React.useState<ImageAutoWriteIdea | null>(null);

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
          {selectedGem.id === 'brand-copy' && (
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
                </select>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-sm border border-slate-200 dark:border-slate-700">
                <Volume2 size={12} className="text-slate-500" />
                <select 
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                >
                  <option value="Kore">Kore (Female)</option>
                  <option value="Puck">Puck (Male)</option>
                  <option value="Charon">Charon (Male)</option>
                  <option value="Fenrir">Fenrir (Male)</option>
                  <option value="Zephyr">Zephyr (Female)</option>
                </select>
              </div>
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

      {selectedGem.type === 'video' && (
        <div className="space-y-4 pb-2 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Frame Image Upload Box */}
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={12} className="text-blue-500" />
                First Frame Image (Start Point)
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
                    {selectedModel === 'veo-3.1-lite-generate-preview' ? (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                        Reference Ignored by Active Model
                      </span>
                    ) : (
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                        Video Start Reference (Active)
                      </span>
                    )}
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

            {/* Last Frame Image Upload Box */}
            <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon size={12} className="text-violet-500" />
                Last Frame Image (End Point)
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
                    {selectedModel !== 'veo-3.1-generate-preview' ? (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                        Reference Ignored by Active Model
                      </span>
                    ) : (
                      <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider">
                        Video End Reference (Active)
                      </span>
                    )}
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
        </div>
      )}

      {(selectedGem.type === 'image' || selectedGem.type === 'video') && (
        <div className="space-y-4 pb-2 pt-1">
          <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-500 animate-pulse" />
                Ingredients Reference Images ({ingredientsContexts.length}/3)
              </span>
              {selectedGem.type === 'image' ? (
                <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider bg-purple-500/10 px-1.5 py-0.5 rounded-xs">
                  Prompt Guided Elements
                </span>
              ) : selectedModel === 'veo-3.1-generate-preview' ? (
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded-xs">
                  Active (Cinematic High)
                </span>
              ) : (
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded-xs">
                  Switch to "Cinematic High" to Activate References
                </span>
              )}
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
              <ImageIcon size={12} className="text-emerald-500" />
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
              <ImageIcon size={12} className="text-amber-500" />
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
