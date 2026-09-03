import React, { useRef, useState } from 'react';
import { Upload, Trash2, CheckCircle2, Image as ImageIcon, Download, Loader2, Sparkles, FileText, Eye, X, Send, Volume2, Play, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeAsset, generateImage } from '@web/infrastructure/ai/geminiService.js';
import type { AssetAnalysis } from '@shared-types/creative.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { resizeImageIfNeeded } from '@utils/image.js';
import { useAuth } from '@web/features/auth/hooks/useAuth.js';
import { uploadAssetToStorage } from '@web/infrastructure/storage/storageClient.js';
import { saveUserAsset, deleteUserAsset } from '@web/infrastructure/repositories/assetRepository.js';
import { cn, downloadFile } from '@web/lib/utils.js';

export interface Asset {
  id: string;
  name: string;
  data: string; // base64 for images, markdown/text for docs, url for video/audio
  type: 'image' | 'doc' | 'video' | 'audio';
  selected: boolean;
  analysis?: AssetAnalysis;
  isProductContext?: boolean;
  isFaceContext?: boolean;
}

interface AssetLibraryProps {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  onClose: () => void;
  brandGuidelines: BrandGuidelines;
  isSyncing?: boolean;
  setIsSyncing?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AssetLibrary = ({ assets, setAssets, onClose, brandGuidelines, isSyncing, setIsSyncing }: AssetLibraryProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [showGenInput, setShowGenInput] = useState(false);
  const { user } = useAuth();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawData = reader.result as string;
        const base64Data = await resizeImageIfNeeded(rawData);
        const tempId = Math.random().toString(36).substring(7);
        
        const newAsset: Asset = {
          id: tempId,
          name: file.name,
          data: base64Data,
          type: 'image',
          selected: true
        };
        setAssets(prev => [...prev, newAsset]);

        if (user) {
          setIsSyncing?.(true);
          try {
            const hostedUrl = await saveUserAsset(user.uid, tempId, file.name, base64Data, 'image', file.name);
            if (hostedUrl !== base64Data) {
              setAssets(prev => prev.map(a => a.id === tempId ? { ...a, data: hostedUrl } : a));
            }
          } catch (e) {
            console.error("Upload sync failed:", e);
          } finally {
            setIsSyncing?.(false);
          }
        }

        try {
          const analysis = await analyzeAsset(base64Data);
          setAssets(prev => prev.map(a => a.id === tempId ? { ...a, analysis } : a));
        } catch (error) {
          console.error("Failed to analyze asset:", error);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateAsset = async () => {
    if (!genPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await generateImage(genPrompt, brandGuidelines);
      const id = Math.random().toString(36).substring(7);
      const newAsset: Asset = {
        id,
        name: `${genPrompt.slice(0, 20)}.jpg`,
        data: res.url,
        type: 'image',
        selected: false
      };
      setAssets(prev => [newAsset, ...prev]);

      if (user) {
        setIsSyncing?.(true);
        try {
          const hostedUrl = await saveUserAsset(user.uid, id, newAsset.name, res.url, 'image', newAsset.name);
          if (hostedUrl !== res.url) {
            setAssets(prev => prev.map(a => a.id === id ? { ...a, data: hostedUrl } : a));
          }
        } catch (e) {
          console.error("Generated asset sync failed:", e);
        } finally {
          setIsSyncing?.(false);
        }
      }

      setGenPrompt('');
      setShowGenInput(false);
    } catch (error) {
      console.error("Failed to generate asset:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelect = async (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    const nextSelected = !asset.selected;
    setAssets(prev => prev.map(a => a.id === id ? { ...a, selected: nextSelected } : a));
  };

  const deleteAsset = async (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));

    if (user) {
      setIsSyncing?.(true);
      try {
        await deleteUserAsset(user.uid, id);
      } catch (e) {
        console.error("Deletion sync failed:", e);
      } finally {
        setIsSyncing?.(false);
      }
    }
  };

  const downloadAsset = (asset: Asset) => {
    downloadFile(asset.data, asset.name);
  };

  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [docLoading, setDocLoading] = useState(false);

  React.useEffect(() => {
    if (viewingAsset?.type === 'doc') {
      if (viewingAsset.data.startsWith('http')) {
        setDocLoading(true);
        setDocContent(''); // Clear previous content
        fetch(`/api/proxy?url=${encodeURIComponent(viewingAsset.data)}`)
          .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.text();
          })
          .then(text => {
            setDocContent(text);
          })
          .catch(err => {
            console.error("Failed to load document:", err);
            setDocContent(`> [!CAUTION]\n> **Failed to load document content.**\n>\n> ${err.message}\n\nRaw URL: ${viewingAsset.data}`);
          })
          .finally(() => {
            setDocLoading(false);
          });
      } else {
        setDocContent(viewingAsset.data);
        setDocLoading(false);
      }
    } else {
      setDocContent('');
      setDocLoading(false);
    }
  }, [viewingAsset]);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Asset Library</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Upload and manage brand assets. Selected assets will influence the generation of creatives.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowGenInput(!showGenInput)}
              className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-sm font-medium hover:opacity-90 transition-all"
            >
              <Sparkles size={18} />
              Generate Asset
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2 rounded-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <Upload size={18} />
              Upload
            </button>
            <button 
              onClick={onClose}
              className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-4 py-2 rounded-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              Done
            </button>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            multiple 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <AnimatePresence>
          {showGenInput && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold uppercase tracking-widest text-xs">
                  <Sparkles size={14} className="text-amber-500" />
                  AI Asset Generator
                </div>
                <div className="flex gap-3">
                  <input 
                    type="text"
                    value={genPrompt}
                    onChange={(e) => setGenPrompt(e.target.value)}
                    placeholder="Describe the asset you want to generate (e.g., 'A minimalist office workspace with brand colors')..."
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateAsset()}
                  />
                  <button 
                    onClick={handleGenerateAsset}
                    disabled={isGenerating || !genPrompt.trim()}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-sm font-bold text-xs uppercase tracking-widest disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500">
            <ImageIcon size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No assets uploaded yet</p>
            <p className="text-sm mt-1">Upload images to use them as context for your generations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {assets.map(asset => (
              <div 
                key={asset.id} 
                className={cn(
                  "group relative rounded-xl overflow-hidden border-2 transition-all duration-200 bg-white dark:bg-slate-900",
                  asset.selected 
                    ? "border-slate-900 dark:border-white shadow-md" 
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div 
                  className="aspect-square w-full cursor-pointer relative"
                  onClick={() => toggleSelect(asset.id)}
                >
                  {asset.type === 'image' ? (
                    <img 
                      src={asset.data} 
                      alt={asset.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : asset.type === 'video' ? (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center p-2 relative overflow-hidden">
                      <video 
                        src={asset.data} 
                        className="w-full h-full object-contain"
                        muted
                        onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                        onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                      />
                      <div className="absolute top-2 right-2">
                        <div className="bg-slate-950/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-white/20">Video</div>
                      </div>
                    </div>
                  ) : asset.type === 'audio' ? (
                    <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center p-6 text-center">
                      <Volume2 size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest line-clamp-2">{asset.name}</p>
                      <div className="absolute top-2 right-2">
                        <div className="bg-slate-950/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-white/20">Audio</div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center p-6 text-center">
                      <FileText size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest line-clamp-2">{asset.name}</p>
                    </div>
                  )}
                  <div className={cn(
                    "absolute inset-0 bg-black/40 transition-opacity flex flex-col items-center justify-center p-4 text-center",
                    asset.selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    {asset.selected ? (
                      <CheckCircle2 
                        size={32} 
                        className="text-white scale-100 transition-transform mb-2" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-white/50 mb-2" />
                    )}
                    
                    {asset.type === 'image' && (
                      asset.analysis ? (
                        <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <p className="text-[10px] font-bold text-white uppercase tracking-widest">{asset.analysis.theme}</p>
                          <p className="text-[9px] text-white/70 italic">{asset.analysis.mood}</p>
                          <div className="flex items-center justify-center gap-1 mt-2">
                            {asset.analysis.colors.slice(0, 3).map((c, i) => (
                              <div key={i} className="w-2 h-2 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 size={16} className="text-white/50 animate-spin" />
                          <span className="text-[8px] font-bold text-white/50 uppercase tracking-tighter">Analyzing Style...</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                
                <div className="p-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate pr-2" title={asset.name}>
                    {asset.name}
                  </p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingAsset(asset);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm transition-colors"
                      title="View"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); downloadAsset(asset); }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm transition-colors"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                    <button 
                      onClick={() => deleteAsset(asset.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {viewingAsset && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 lg:p-12 bg-slate-950/80 backdrop-blur-sm">
            <div 
              className="absolute inset-0" 
              onClick={() => setViewingAsset(null)} 
            />
            <div className="relative w-full max-w-5xl max-h-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  {viewingAsset.type === 'image' ? <ImageIcon className="text-slate-400" /> : 
                   viewingAsset.type === 'video' ? <Play className="text-slate-400" /> :
                   viewingAsset.type === 'audio' ? <Volume2 className="text-slate-400" /> :
                   <FileText className="text-slate-400" />}
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-md">{viewingAsset.name}</h2>
                </div>
                <button 
                  onClick={() => setViewingAsset(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-slate-50/30 dark:bg-slate-950/30">
                <div className="min-h-full flex flex-col items-center justify-center">
                {viewingAsset.type === 'image' && (
                  <img 
                    src={viewingAsset.data} 
                    alt={viewingAsset.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-sm shadow-lg border border-slate-200 dark:border-slate-800"
                    referrerPolicy="no-referrer"
                  />
                )}
                
                {viewingAsset.type === 'video' && (
                  <video 
                    src={viewingAsset.data} 
                    controls 
                    autoPlay
                    className="max-w-full max-h-[70vh] rounded-sm shadow-lg border border-slate-200 dark:border-slate-800 bg-black"
                  />
                )}

                {viewingAsset.type === 'audio' && (
                  <div className="flex flex-col items-center gap-6 w-full max-w-md">
                     <Volume2 size={64} className="text-slate-300 dark:text-slate-600" />
                     <audio src={viewingAsset.data} controls className="w-full" />
                  </div>
                )}
                
                {viewingAsset.type === 'doc' && (
                  <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-sm shadow-sm border border-slate-100 dark:border-slate-800">
                    {docLoading ? (
                      <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <Loader2 className="animate-spin" size={32} />
                        <span className="text-xs font-bold uppercase tracking-widest italic">Retrieving Brand Brief...</span>
                      </div>
                    ) : (
                      <div className="p-8 md:p-12 markdown-body">
                        <ReactMarkdown>{docContent}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900">
                <button 
                  onClick={() => downloadAsset(viewingAsset)}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-2 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-xs uppercase tracking-widest"
                >

                  <Download size={16} />
                  Download
                </button>
                <button 
                  onClick={() => setViewingAsset(null)}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-2 rounded-sm font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
