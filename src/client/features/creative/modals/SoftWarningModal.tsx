import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';

export interface SoftWarningModalProps {
  softWarning: any;
  onClose: () => void;
  onProceed: () => Promise<void> | void;
  onSwitchModel: (modelId: string) => void;
}

export const SoftWarningModal: React.FC<SoftWarningModalProps> = ({
  softWarning,
  onClose,
  onProceed,
  onSwitchModel
}) => {
  if (!softWarning) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-sm shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col p-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-sm shrink-0">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Active Reference Alert</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Image Capability Warning</p>
          </div>
        </div>

        <div className="text-xs text-slate-750 dark:text-slate-305 leading-relaxed font-light whitespace-pre-line py-2">
          {softWarning.message || softWarning}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-wider cursor-pointer"
          >
            Cancel
          </button>
          
          {softWarning.recommendedModel && (
            <button
              type="button"
              onClick={() => onSwitchModel(softWarning.recommendedModel)}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-sm hover:opacity-90 transition-opacity uppercase tracking-wider cursor-pointer"
            >
              Switch Model
            </button>
          )}

          <button
            type="button"
            onClick={() => onProceed()}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded-sm hover:bg-amber-600 transition-colors uppercase tracking-wider cursor-pointer shadow-sm"
          >
            Generate Anyway
          </button>
        </div>
      </motion.div>
    </div>
  );
};
