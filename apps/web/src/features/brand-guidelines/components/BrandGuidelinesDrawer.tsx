import React, { useState } from 'react';
import { X, Trash2, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { AppIcon } from '@web/shared/components/icons/AppIconRegistry.js';
import { BrandLogo } from '@web/features/brand/components/BrandLogo.js';
import type { BrandGuidelines } from '@shared-types/brand.js';
import { generateBrandLogoAI } from '@web/infrastructure/ai/promptBuilders.js';

export interface BrandGuidelinesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editingGuidelines: BrandGuidelines;
  setEditingGuidelines: React.Dispatch<React.SetStateAction<BrandGuidelines>>;
  onSave: () => Promise<void>;
  onWipe: () => Promise<void>;
}

export const BrandGuidelinesDrawer: React.FC<BrandGuidelinesDrawerProps> = ({
  isOpen,
  onClose,
  editingGuidelines,
  setEditingGuidelines,
  onSave,
  onWipe
}) => {
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [logoPrompt, setLogoPrompt] = useState('');
  const [eraseConfirmState, setEraseConfirmState] = useState<'idle' | 'confirming'>('idle');

  if (!isOpen || !editingGuidelines) return null;

  const handleGenerateLogo = async () => {
    if (!logoPrompt.trim()) return;
    try {
      setIsGeneratingLogo(true);
      const generated = await generateBrandLogoAI(
        editingGuidelines.name,
        editingGuidelines.industry,
        editingGuidelines.colors || [],
        logoPrompt || editingGuidelines.tone
      );

      setEditingGuidelines(prev => ({ ...prev, logo: generated }));
    } catch (e) {
      console.error("Failed to generate brand logo with AI:", e);
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingGuidelines(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandLogo customLogo={editingGuidelines.logo} brandName={editingGuidelines.name} className="h-8 w-8" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Brand Identity</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">Parameters & Colors</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-sm transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* Brand Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Brand Name</label>
              <input 
                type="text"
                value={editingGuidelines.name}
                onChange={(e) => setEditingGuidelines({ ...editingGuidelines, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-sm text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Industry</label>
              <input 
                type="text"
                value={editingGuidelines.industry}
                onChange={(e) => setEditingGuidelines({ ...editingGuidelines, industry: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-sm text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Brand Tone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AppIcon name="brand-typography" size={13} strokeWidth={2} />
                Tone & Voice
              </label>
              <input 
                type="text"
                value={editingGuidelines.tone}
                onChange={(e) => setEditingGuidelines({ ...editingGuidelines, tone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-sm text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Color Palette */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AppIcon name="brand-palette" size={13} strokeWidth={2} />
                Palette Colors
              </label>
              <div className="flex gap-3">
                {editingGuidelines.colors?.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm">
                    <input 
                      type="color"
                      value={col}
                      onChange={(e) => {
                        const newColors = [...(editingGuidelines.colors || [])];
                        newColors[idx] = e.target.value;
                        setEditingGuidelines({ ...editingGuidelines, colors: newColors });
                      }}
                      className="w-7 h-7 rounded-sm border-none cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{col}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Logo Settings */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <AppIcon name="brand-logo" size={13} strokeWidth={2} />
                Brand Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-2 shrink-0">
                  {editingGuidelines.logo ? (
                    <img src={editingGuidelines.logo} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xs text-slate-400">No Logo</span>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <label className="inline-block px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-sm text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors">
                    <span>Upload Logo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  {editingGuidelines.logo && (
                    <button 
                      onClick={() => setEditingGuidelines({ ...editingGuidelines, logo: '' })}
                      className="block text-[10px] text-rose-500 font-bold uppercase tracking-wider hover:underline cursor-pointer"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>

              {/* AI Logo Generator inside Drawer */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-sm space-y-2">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={11} className="text-rose-500" />
                  Generate AI Logo
                </span>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={logoPrompt}
                    onChange={(e) => setLogoPrompt(e.target.value)}
                    placeholder="e.g. Minimalist geometric hexagon"
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs rounded-sm focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                  <button 
                    onClick={handleGenerateLogo}
                    disabled={isGeneratingLogo || !logoPrompt.trim()}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold uppercase tracking-wider rounded-sm disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    {isGeneratingLogo ? <Loader2 size={12} className="animate-spin" /> : "Generate"}
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone: Wipe */}
            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-sm space-y-3 mt-8">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
                <Trash2 size={14} />
                <span>Reset Brand Profile</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Clearing brand parameters will return the workspace to onboarding mode.
              </p>
              {eraseConfirmState === 'idle' ? (
                <button
                  type="button"
                  onClick={() => setEraseConfirmState('confirming')}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-xs font-bold rounded-sm cursor-pointer transition-colors"
                >
                  Reset Brand Kit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onWipe}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-sm cursor-pointer transition-colors"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setEraseConfirmState('idle')}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-sm cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <button 
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={onSave}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
