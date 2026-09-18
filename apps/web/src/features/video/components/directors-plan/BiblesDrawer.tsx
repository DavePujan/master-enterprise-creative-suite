import React, { useState } from 'react';
import type { 
  AdSpecCharacterBible, 
  AdSpecProductBible, 
  AdSpecLocationBible, 
  AdSpecBrand 
} from '@shared-types/adSpec.js';
import { 
  X, 
  Users, 
  Package, 
  MapPin, 
  ShieldAlert, 
  Lock, 
  Check, 
  Sparkles,
  Palette
} from 'lucide-react';
import { cn } from '@web/lib/utils.js';

export interface BiblesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  characters?: AdSpecCharacterBible;
  products?: AdSpecProductBible;
  locations?: AdSpecLocationBible;
  brand?: AdSpecBrand;
}

export const BiblesDrawer: React.FC<BiblesDrawerProps> = ({
  isOpen,
  onClose,
  characters,
  products,
  locations,
  brand
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'products' | 'locations' | 'brand'>('characters');

  if (!isOpen) return null;

  const charList = characters?.characters || [];
  const prodList = products?.products || [];
  const locList = locations?.locations || [];
  const deterministicRules = brand?.deterministicRules || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col text-left overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-sans">
              Production Bibles & Brand Rules
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Persistent Entities, Brand Intelligence & Machine-Readable Locks
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-sm"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 p-1 gap-1 shrink-0">
          {[
            { id: 'characters', label: `Characters (${charList.length})`, icon: Users },
            { id: 'products', label: `Products (${prodList.length})`, icon: Package },
            { id: 'locations', label: `Locations (${locList.length})`, icon: MapPin },
            { id: 'brand', label: `Brand Rules (${deterministicRules.length})`, icon: Palette },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans",
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Characters Tab */}
          {activeTab === 'characters' && (
            <div className="space-y-4">
              {charList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No registered characters. This ad focuses on product cinematography and kinetic environments.
                </div>
              ) : (
                charList.map(char => (
                  <div 
                    key={char.characterId}
                    className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-rose-500" />
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{char.name}</span>
                        <span className="text-slate-400 font-mono">({char.characterId})</span>
                      </div>
                      <span className="capitalize px-2 py-0.5 rounded-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                        {char.role}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Demographics:</span> {char.demographics?.ageRange || 'Adult'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Appearance:</span> {char.physicalAppearance?.face || 'Clean production profile'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Wardrobe:</span> {char.wardrobe?.defaultOutfit || 'Active casual'}
                      </div>
                    </div>

                    {/* Preserved Granular Locks */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Preserved Locks:</span>
                      <div className="flex flex-wrap gap-1">
                        {char.locks && char.locks.length > 0 ? (
                          char.locks.map((lock, lIdx) => (
                            <span 
                              key={lIdx}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-1.5 py-0.5 rounded-xs"
                            >
                              <Lock size={9} />
                              {lock}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Unlocked</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {prodList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No registered products in bible.
                </div>
              ) : (
                prodList.map(prod => (
                  <div 
                    key={prod.productId}
                    className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={14} className="text-rose-500" />
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{prod.name}</span>
                        <span className="text-slate-400 font-mono">({prod.productId})</span>
                      </div>
                      <span className="capitalize px-2 py-0.5 rounded-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                        {prod.category}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Form Factor:</span> {prod.physicalTraits?.formFactor || 'Precision manufactured item'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Logo Placement:</span> {prod.branding?.logoPlacement || 'Front Center Hero'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Packaging:</span> {prod.branding?.packagingType || 'Retail primary'}
                      </div>
                    </div>

                    {/* Preserved Granular Locks */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Preserved Locks:</span>
                      <div className="flex flex-wrap gap-1">
                        {prod.locks && prod.locks.length > 0 ? (
                          prod.locks.map((lock, lIdx) => (
                            <span 
                              key={lIdx}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-1.5 py-0.5 rounded-xs"
                            >
                              <Lock size={9} />
                              {lock}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Unlocked</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <div className="space-y-4">
              {locList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No registered custom locations. Using dynamic studio stage.
                </div>
              ) : (
                locList.map(loc => (
                  <div 
                    key={loc.locationId}
                    className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-rose-500" />
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{loc.name}</span>
                        <span className="text-slate-400 font-mono">({loc.locationId})</span>
                      </div>
                      <span className="capitalize px-2 py-0.5 rounded-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                        {loc.environmentType}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Architecture:</span> {loc.spatialTraits?.architectureStyle || 'Modern minimal'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Default Lighting:</span> {loc.lightingDefault?.timeOfDay?.replace(/_/g, ' ') || 'Daylight'} ({loc.lightingDefault?.mood || 'Natural'})
                      </div>
                    </div>

                    {/* Preserved Granular Locks */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Preserved Locks:</span>
                      <div className="flex flex-wrap gap-1">
                        {loc.locks && loc.locks.length > 0 ? (
                          loc.locks.map((lock, lIdx) => (
                            <span 
                              key={lIdx}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-1.5 py-0.5 rounded-xs"
                            >
                              <Lock size={9} />
                              {lock}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Unlocked</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Brand Rules Tab */}
          {activeTab === 'brand' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {brand?.brandName || 'Brand Identity'}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {brand?.visualStyle?.aestheticMood || 'Modern Commercial'}
                  </span>
                </div>

                {/* Color Palette Chips */}
                {brand?.visualStyle?.palette && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">Brand Palette</span>
                    <div className="flex items-center gap-2">
                      {brand.visualStyle.palette.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[10px] font-mono">
                          <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-2xs" style={{ backgroundColor: color }} />
                          <span>{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Deterministic Rules */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase block">
                  Deterministic Brand Guardrails ({deterministicRules.length})
                </span>

                {deterministicRules.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    Standard brand safety guardrails active.
                  </div>
                ) : (
                  deterministicRules.map((rule, idx) => (
                    <div 
                      key={rule.ruleId || idx}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xs text-xs flex items-start gap-2.5"
                    >
                      <ShieldAlert size={14} className={rule.priority === 'critical' ? 'text-rose-500 shrink-0 mt-0.5' : 'text-amber-500 shrink-0 mt-0.5'} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white uppercase text-[10px] font-mono">
                            Priority: {rule.priority}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                          {rule.ruleText}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
