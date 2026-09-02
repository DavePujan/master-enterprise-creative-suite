import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, X, Loader2 } from 'lucide-react';

export interface RefinePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultData?: string;
  refinePrompt: string;
  setRefinePrompt: (val: string) => void;
  isRefining: boolean;
  onRefine: () => Promise<void> | void;
}

export const RefinePromptModal: React.FC<RefinePromptModalProps> = ({
  isOpen,
  onClose,
  resultData,
  refinePrompt,
  setRefinePrompt,
  isRefining,
  onRefine
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <motion.div 

        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-sm">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Refine with AI</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Modify lighting, elements, composition, and style</p>
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
          {resultData && (
            <div className="max-h-48 overflow-hidden rounded-sm border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-2">
              <img 
                src={resultData} 
                alt="Source" 
                className="max-h-44 object-contain rounded-sm"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Refinement Instruction
            </label>
            <textarea
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              placeholder="e.g. Change the background to a sunset beach scene, increase contrast and lighting..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm p-3 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 h-24 resize-none"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-sm text-xs font-bold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onRefine()}
            disabled={isRefining || !refinePrompt.trim()}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isRefining ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{isRefining ? 'Refining...' : 'Apply Refinement'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
