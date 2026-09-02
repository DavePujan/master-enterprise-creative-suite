import React from 'react';
import { Fingerprint, X, Check, Loader2 } from 'lucide-react';

export interface HumanTouchItem {
  title: string;
  prompt: string;
  imageUrl?: string;
  role: string;
  modelsUsed: string;
}

export interface HumanTouchRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: HumanTouchItem | null;
  comment: string;
  setComment: (val: string) => void;
  submitting: boolean;
  successMsg: string | null;
  onSubmit: () => Promise<void>;
}

export const HumanTouchRequestModal: React.FC<HumanTouchRequestModalProps> = ({
  isOpen,
  onClose,
  item,
  comment,
  setComment,
  submitting,
  successMsg,
  onSubmit
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-110 p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 max-w-xl w-full border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl relative overflow-hidden flex flex-col">

        
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-sm">
              <Fingerprint size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Human Touch Curation</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Expert human polish by Writopedia artists</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-sm border border-slate-200/60 dark:border-slate-700/60">
            {item.imageUrl ? (
              <img 
                src={item.imageUrl} 
                alt="Selected Asset" 
                className="w-16 h-16 object-cover rounded-sm border border-slate-200 dark:border-slate-700 shrink-0" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-sm bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400 shrink-0">
                Asset
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{item.prompt}</p>
              <span className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mt-1">
                Role: {item.role}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Specific Creative Feedback / Desired Adjustments
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Please refine lighting, sharpen details on foreground product, adjust tone slightly..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm p-3 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 h-24 resize-none"
            />
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-sm flex items-center gap-2 text-xs font-semibold">
              <Check size={14} />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Fingerprint size={13} />}
            <span>{submitting ? 'Submitting...' : 'Dispatch Request'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
