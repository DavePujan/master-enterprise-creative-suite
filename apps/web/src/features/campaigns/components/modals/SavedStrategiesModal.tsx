import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  History,
  Search,
  X,
  Filter,
  ArrowUpDown,
  Clock,
  ChevronRight,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Eye,
  Loader2,
  FileText,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Tag,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '@web/infrastructure/api/apiClient.js';

export interface SavedStrategySummary {
  id: string;
  workspace_id?: string;
  title?: string;
  status?: string;
  stage_number?: number;
  stage_total?: number;
  stage_label?: string;
  framework_id?: string;
  created_at?: string;
  updated_at?: string;
  current_version_id?: string;
  version_number?: number;
  version_count?: number;
  territory_name?: string;
  territory_premise?: string;
  versions?: any[];
}

export interface SavedStrategiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedStrategies: SavedStrategySummary[];
  isLoading: boolean;
  onLoadStrategy: (strategyId: string) => Promise<void> | void;
  onRefreshStrategies: () => Promise<void> | void;
  hasUnsavedDraft?: boolean;
}

/**
 * Validates and formats timestamps cleanly.
 * Defensively extracts timestamp from ID if missing or invalid.
 * Example: 'Saved Oct 08, 2026 · 04:30 PM'
 */
export function formatSavedDate(dateStr?: string | null, id?: string | null): string {
  let d: Date | null = null;
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) d = parsed;
  }
  // Defensive extraction from timestamped ID (e.g. mem-strat-1791545226544)
  if (!d && id) {
    const match = String(id).match(/\d{12,14}/);
    if (match) {
      const parsed = new Date(Number(match[0]));
      if (!isNaN(parsed.getTime())) d = parsed;
    }
  }
  if (!d) {
    d = new Date();
  }

  try {
    const dateFormatted = d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `Saved ${dateFormatted} · ${timeFormatted}`;
  } catch {
    return 'Saved recently';
  }
}

/**
 * Humanizes raw technical framework slugs into clean, readable taxonomy chips.
 * e.g. 'SEASONAL-FESTIVE-EMOTIONAL-HOMECOMING' -> 'Seasonal & Festive'
 */
export function humanizeFramework(rawFramework?: string | null): string {
  if (!rawFramework) return 'General Strategy';
  const clean = rawFramework.toUpperCase().trim();
  if (clean.includes('SEASONAL') || clean.includes('FESTIVE')) return 'Seasonal Campaign';
  if (clean.includes('MEME') || clean.includes('SUBCULTURE') || clean.includes('CULTURE')) return 'Culture & Memes';
  if (clean.includes('PERFORMANCE') || clean.includes('CONVERSION') || clean.includes('FLYWHEEL')) return 'Performance & Flywheel';
  if (clean.includes('CREATOR') || clean.includes('MOMENTUM') || clean.includes('INFLUENCER')) return 'Creator Momentum';
  if (clean.includes('BRAND') || clean.includes('POSITIONING')) return 'Brand & Equity';
  if (clean.includes('PRODUCT') || clean.includes('LAUNCH')) return 'Product Launch';

  return rawFramework
    .split(/[-_]+/)
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extracts a concise 4-character ID badge to differentiate repeated names.
 */
export function formatShortId(id?: string | null): string {
  if (!id) return '#0000';
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  return `#${clean.slice(-4).toUpperCase()}`;
}

export const SavedStrategiesModal: React.FC<SavedStrategiesModalProps> = ({
  isOpen,
  onClose,
  savedStrategies,
  isLoading,
  onLoadStrategy,
  onRefreshStrategies,
  hasUnsavedDraft = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name'>('recent');

  // Preview Drawer State
  const [previewStrategyId, setPreviewStrategyId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Loading Strategy Action
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);

  // 3-Dot Actions Menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingStrategy, setRenamingStrategy] = useState<{ id: string; title: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isSubmittingRename, setIsSubmittingRename] = useState(false);

  // Delete Confirmation
  const [deletingStrategy, setDeletingStrategy] = useState<{ id: string; title: string } | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Inline Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (renamingStrategy) {
          setRenamingStrategy(null);
        } else if (deletingStrategy) {
          setDeletingStrategy(null);
        } else if (previewStrategyId) {
          setPreviewStrategyId(null);
        } else if (activeMenuId) {
          setActiveMenuId(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, renamingStrategy, deletingStrategy, previewStrategyId, activeMenuId, onClose]);

  // Temporary toast banner auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Extract distinct categories for filter pills
  const categories = useMemo(() => {
    const set = new Set<string>();
    savedStrategies.forEach(s => {
      const cat = humanizeFramework(s.framework_id);
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [savedStrategies]);

  // Filter and sort strategies
  const filteredStrategies = useMemo(() => {
    return savedStrategies
      .filter(s => {
        // Category filter
        if (selectedCategory !== 'ALL') {
          const cat = humanizeFramework(s.framework_id);
          if (cat !== selectedCategory) return false;
        }

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const title = (s.title || '').toLowerCase();
          const territory = (s.territory_name || s.territory_premise || '').toLowerCase();
          const cat = humanizeFramework(s.framework_id).toLowerCase();
          const shortId = formatShortId(s.id).toLowerCase();

          return title.includes(q) || territory.includes(q) || cat.includes(q) || shortId.includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return (a.title || '').localeCompare(b.title || '');
        }

        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();

        if (sortBy === 'oldest') {
          return dateA - dateB;
        }
        // 'recent'
        return dateB - dateA;
      });
  }, [savedStrategies, selectedCategory, searchQuery, sortBy]);

  // Handle Strategy Loading with Unsaved Work Prompt
  const handleConfirmLoad = async (strategyId: string) => {
    if (hasUnsavedDraft) {
      const confirmed = window.confirm(
        'Load this saved strategy? Unsaved modifications in your active session will be replaced.'
      );
      if (!confirmed) return;
    }

    setLoadingCardId(strategyId);
    try {
      await onLoadStrategy(strategyId);
      onClose();
    } finally {
      setLoadingCardId(null);
    }
  };

  // Open Preview Drawer
  const handleOpenPreview = async (strategyId: string) => {
    setPreviewStrategyId(strategyId);
    setIsLoadingPreview(true);

    // Pre-populate immediately with summary details so user sees zero delay
    const summaryItem = savedStrategies.find(s => s.id === strategyId);
    if (summaryItem) {
      setPreviewData({
        ...summaryItem,
        campaign_strategy_versions: summaryItem.versions && summaryItem.versions.length > 0
          ? summaryItem.versions
          : [{
              version_number: summaryItem.version_number || 1,
              selected_territory: {
                name: summaryItem.territory_name || summaryItem.title,
                premise: summaryItem.territory_premise || 'Master Strategy synthesized for this route.'
              },
              master_strategy: {
                bigIdea: `${summaryItem.title || 'Master Strategy'}: Category dominance engineered through high-conviction positioning.`,
                creativeTension: 'Resolving fundamental market hesitation with emotional resonance and compelling value.'
              },
              downstream_briefs: {
                canonicalAdSpec: { id: `adspec_${summaryItem.id}` }
              }
            }]
      });
    }

    try {
      const res: any = await apiClient.get(`/api/campaign/strategy/${strategyId}`);
      const data = res.strategy || res.data?.strategy;
      if (data) {
        setPreviewData(data);
      }
    } catch (err) {
      console.warn('Backend fetch for preview details completed with local fallback:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Submit Rename
  const handleSaveRename = async () => {
    if (!renamingStrategy || !renameInput.trim()) return;
    setIsSubmittingRename(true);
    try {
      await apiClient.patch(`/api/campaign/strategy/${renamingStrategy.id}`, {
        title: renameInput.trim()
      });
      setToastMessage(`Renamed to "${renameInput.trim()}"`);
      setRenamingStrategy(null);
      await onRefreshStrategies();
    } catch (err: any) {
      alert(err?.message || 'Failed to rename campaign');
    } finally {
      setIsSubmittingRename(false);
    }
  };

  // Submit Duplicate
  const handleDuplicate = async (strategy: SavedStrategySummary) => {
    setActiveMenuId(null);
    try {
      await apiClient.post(`/api/campaign/strategy/${strategy.id}/duplicate`, {});
      setToastMessage(`Duplicated "${strategy.title || 'Strategy'}"`);
      await onRefreshStrategies();
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate campaign');
    }
  };

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!deletingStrategy) return;
    setIsSubmittingDelete(true);
    try {
      await apiClient.delete(`/api/campaign/strategy/${deletingStrategy.id}`);
      setToastMessage(`Deleted "${deletingStrategy.title}"`);
      setDeletingStrategy(null);
      await onRefreshStrategies();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete campaign');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 sm:p-6 overflow-hidden">
      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Fixed Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <History size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Saved Strategies</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                  Workspace Library
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Find and resume a previous campaign</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-medium text-slate-400 hidden sm:block">
              {filteredStrategies.length} shown
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Toast Alert Banner */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 flex items-center gap-2 text-xs text-emerald-400"
            >
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fixed Toolbar: Search, Filters, and Sort */}
        <div className="shrink-0 px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur z-10 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search strategies by name, territory, or category..."
                className="w-full bg-slate-950/70 border border-slate-800 focus:border-rose-500/60 focus:ring-1 focus:ring-rose-500/40 rounded-xl pl-9.5 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="relative shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                <ArrowUpDown size={13} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer pr-1"
                >
                  <option value="recent" className="bg-slate-900 text-slate-200">Recently saved</option>
                  <option value="oldest" className="bg-slate-900 text-slate-200">Oldest first</option>
                  <option value="name" className="bg-slate-900 text-slate-200">Name (A–Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer shrink-0 text-[11px] ${
                  selectedCategory === 'ALL'
                    ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All Categories ({savedStrategies.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer shrink-0 text-[11px] ${
                    selectedCategory === cat
                      ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Strategy Card List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-6 space-y-3 scrollbar-thin">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 size={26} className="animate-spin text-rose-500" />
              <span className="text-xs font-medium tracking-wide">Loading workspace strategies...</span>
            </div>
          ) : filteredStrategies.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-400">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  {searchQuery || selectedCategory !== 'ALL'
                    ? 'No matching strategies found'
                    : 'No saved strategies yet'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || selectedCategory !== 'ALL'
                    ? 'Try clearing your search terms or selecting another category filter.'
                    : 'Synthesize a campaign strategy in Stage 04 to permanently save it to your workspace.'}
                </p>
              </div>
              {(searchQuery || selectedCategory !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            filteredStrategies.map(strat => {
              const isCardLoading = loadingCardId === strat.id;
              const formattedDate = formatSavedDate(strat.updated_at || strat.created_at, strat.id);
              const categoryLabel = humanizeFramework(strat.framework_id);
              const shortId = formatShortId(strat.id);
              const isMenuOpen = activeMenuId === strat.id;

              // Generate descriptive subtitle: Territory angle + version number
              const territorySubtitle = strat.territory_name
                ? `${strat.territory_name} · Version ${strat.version_number || 1}`
                : strat.territory_premise
                ? `${strat.territory_premise} · Version ${strat.version_number || 1}`
                : `Master Strategy · Version ${strat.version_number || 1}`;

              return (
                <div
                  key={strat.id}
                  className="relative group rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/80 hover:border-slate-700/90 transition-all duration-150 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left Column: Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-white truncate">
                        {strat.title || 'Untitled Strategy'}
                      </h4>
                      <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800/80">
                        {shortId}
                      </span>
                    </div>

                    <p className="text-xs text-rose-400/90 font-medium mt-0.5 truncate">
                      {territorySubtitle}
                    </p>

                    {/* Metadata Chips */}
                    <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 font-medium text-slate-400">
                        <Clock size={11} className="text-slate-500" />
                        {formattedDate}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-medium text-[10px] border border-slate-700/50">
                        {categoryLabel}
                      </span>

                      {/* Journey Stage Status (out of 5) */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                        strat.stage_number === 5
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : strat.stage_number === 4
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}>
                        {strat.stage_label || `Stage ${strat.stage_number || 4}/5 · Master Strategy`}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 justify-between sm:justify-end">
                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(strat.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700/40"
                    >
                      <Eye size={13} className="text-slate-400" />
                      <span>Preview</span>
                    </button>

                    {/* Primary Load CTA */}
                    <button
                      type="button"
                      disabled={isCardLoading}
                      onClick={() => handleConfirmLoad(strat.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer group-hover:scale-[1.02]"
                    >
                      {isCardLoading ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Loading...</span>
                        </>
                      ) : (
                        <>
                          <span>Load strategy</span>
                          <ChevronRight size={13} />
                        </>
                      )}
                    </button>

                    {/* Three-Dot Menu */}
                    <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : strat.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="Strategy options"
                      >
                        <MoreVertical size={15} />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setRenamingStrategy({ id: strat.id, title: strat.title || '' });
                              setRenameInput(strat.title || '');
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                          >
                            <Edit2 size={12} className="text-slate-400" />
                            <span>Rename</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(strat)}
                            className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                          >
                            <Copy size={12} className="text-slate-400" />
                            <span>Duplicate</span>
                          </button>
                          <div className="my-1 border-t border-slate-800" />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setDeletingStrategy({ id: strat.id, title: strat.title || 'Untitled' });
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 size={12} className="text-rose-400" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info strip */}
        <div className="shrink-0 px-6 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Active Workspace: Creative Suite</span>
          <span>Tip: Press ESC to close</span>
        </div>
      </div>

      {/* Strategy Preview Side-Drawer */}
      <AnimatePresence>
        {previewStrategyId && (
          <div className="fixed inset-0 z-60 flex items-center justify-end bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                <div className="min-w-0 flex-1 pr-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Strategy Preview</span>
                  <h3 className="text-base font-bold text-white truncate">
                    {previewData?.title || 'Loading strategy...'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewStrategyId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                {isLoadingPreview ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 size={24} className="animate-spin text-rose-500" />
                    <span className="text-xs">Fetching campaign blueprints...</span>
                  </div>
                ) : !previewData ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Failed to load preview details.
                  </div>
                ) : (() => {
                  const versions = previewData.campaign_strategy_versions || previewData.versions || [];
                  const latestVer = versions[versions.length - 1] || versions[0] || {};
                  const territory = latestVer.selected_territory || latestVer.selectedTerritory || {};
                  const master = latestVer.master_strategy || latestVer.masterStrategy || {};
                  const briefs = latestVer.downstream_briefs || latestVer.downstreamBriefs || {};

                  return (
                    <div className="space-y-5 text-xs">
                      {/* Territory Banner */}
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Selected Strategic Route
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                            v{latestVer.version_number || 1}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-rose-400">
                          {territory.name || territory.angle || 'Selected Territory'}
                        </h4>
                        <p className="text-slate-300 leading-relaxed">
                          {territory.premise || territory.description || 'No premise recorded for this route.'}
                        </p>
                      </div>

                      {/* Master Big Idea */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Master Big Idea & Positioning
                        </span>
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                          <p className="text-slate-200 font-medium leading-relaxed">
                            {master.bigIdea || master.executiveSummary?.coreConcept || 'Synthesis complete.'}
                          </p>
                        </div>
                      </div>

                      {/* Creative Tension */}
                      {master.creativeTension && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Core Strategic Tension
                          </span>
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300">
                            {master.creativeTension}
                          </div>
                        </div>
                      )}

                      {/* Deliverables Summary */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Included Deliverables & Artifacts
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-center">
                            <span className="block text-base font-bold text-white">
                              {briefs.canonicalAdSpec ? 'Compiled' : 'Draft'}
                            </span>
                            <span className="text-[10px] text-slate-500">AdSpec v1</span>
                          </div>
                          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-center">
                            <span className="block text-base font-bold text-white">
                              {versions.length}
                            </span>
                            <span className="text-[10px] text-slate-500">Total Versions</span>
                          </div>
                        </div>
                      </div>

                      {/* Saved Timestamp */}
                      <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-800">
                        <span>{formatSavedDate(previewData.updated_at || previewData.created_at, previewData.id)}</span>
                        <span className="font-mono">{formatShortId(previewData.id)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Drawer Footer CTA */}
              <div className="p-5 border-t border-slate-800 bg-slate-900 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewStrategyId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = previewStrategyId;
                    setPreviewStrategyId(null);
                    if (id) handleConfirmLoad(id);
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Load into Workspace</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Dialog Modal */}
      {renamingStrategy && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Rename Strategy</h4>
              <button
                type="button"
                onClick={() => setRenamingStrategy(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              autoFocus
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveRename();
              }}
              placeholder="Enter strategy title..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenamingStrategy(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRename || !renameInput.trim()}
                onClick={handleSaveRename}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingRename && <Loader2 size={12} className="animate-spin" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStrategy && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Delete Strategy?</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Are you sure you want to delete <span className="text-slate-200 font-semibold">"{deletingStrategy.title}"</span>? This will permanently remove all version snapshots.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStrategy(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingDelete && <Loader2 size={12} className="animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
