import React, { useState } from 'react';
import type { AdSpec, GenerationRequirements } from '@shared-types/adSpec.js';
import { 
  VIDEO_MODELS, 
  getVideoModelCapabilities 
} from '@web/infrastructure/ai/modelRegistry.js';
import { ProviderBadge, AppIcon } from '@web/shared/components/icons/AppIconRegistry.js';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  Coins, 
  Layers, 
  Camera 
} from 'lucide-react';
import { cn } from '@web/lib/utils.js';

export interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  adSpec: AdSpec;
  userCredits: number;
  onLaunchExecution: (selectedModelId: string) => Promise<void>;
  isLaunching: boolean;
}

export const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  isOpen,
  onClose,
  adSpec,
  userCredits,
  onLaunchExecution,
  isLaunching
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>('google-omni');

  if (!isOpen) return null;

  const requirements: GenerationRequirements = adSpec.generationRequirements || {
    firstFrameRequired: false,
    lastFrameRequired: false,
    minimumReferenceCount: (adSpec.assets?.assets?.length || 0),
    nativeAudioRequired: true,
    supportedAspectRatios: ['9:16', '16:9']
  };

  const selectedModel = VIDEO_MODELS.find(m => m.id === selectedModelId) || VIDEO_MODELS[0];
  const modelCaps = getVideoModelCapabilities(selectedModelId);
  const creditCost = selectedModel.credits || 20;
  const hasSufficientCredits = userCredits >= creditCost;

  // Compatibility evaluations against creative requirements
  const compatibilityChecks = [
    {
      label: 'Duration Support',
      passed: true,
      desc: `Supports ${modelCaps.supportedDurations.join(', ')}`
    },
    {
      label: 'Native Audio Synchronization',
      passed: !requirements.nativeAudioRequired || modelCaps.supportsAudio,
      desc: modelCaps.supportsAudio ? 'Full audio & lip-sync capability' : 'Audio must be generated downstream'
    },
    {
      label: 'Reference Images Conditioning',
      passed: (requirements.minimumReferenceCount || 0) <= modelCaps.maxReferenceImages,
      desc: `Supports ${modelCaps.maxReferenceImages} reference images (Plan requires ${requirements.minimumReferenceCount || 0})`
    },
    {
      label: 'First Frame Keyframing',
      passed: !requirements.firstFrameRequired || modelCaps.supportsFirstFrame,
      desc: modelCaps.supportsFirstFrame ? 'Start keyframe interpolation native' : 'First frame not supported on this model'
    }
  ];

  const hasIncompatibilities = compatibilityChecks.some(c => !c.passed);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-sm">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Director's Plan Approved · Select Video Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Compare engine capabilities and reserve generation credits
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-sm"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Plan Requirements Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs space-y-2">
            <span className="text-[10px] font-bold font-mono uppercase text-slate-400 block">
              Plan Creative Requirements:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-slate-400">Shots:</span>{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{adSpec.shots?.length || 0}</span>
              </div>
              <div>
                <span className="text-slate-400">Duration:</span>{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{adSpec.brief?.desiredDurationSeconds || 15}s</span>
              </div>
              <div>
                <span className="text-slate-400">References:</span>{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{requirements.minimumReferenceCount || 0}</span>
              </div>
              <div>
                <span className="text-slate-400">Audio:</span>{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{requirements.nativeAudioRequired ? 'Native' : 'Post'}</span>
              </div>
            </div>
          </div>

          {/* Model Selection Options */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono block">
              Available Video Engines ({VIDEO_MODELS.length})
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VIDEO_MODELS.map(model => {
                const isSelected = model.id === selectedModelId;
                const isGoogle = model.id.includes('omni') || model.id.includes('veo');
                const isFal = model.id.includes('kling') || model.id.includes('seedance');

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModelId(model.id)}
                    className={cn(
                      "p-3.5 rounded-sm border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                      isSelected
                        ? "bg-rose-50/20 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30 text-slate-900 dark:text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-350 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 font-bold text-xs font-sans">
                        {isGoogle && <ProviderBadge provider="google" />}
                        {isFal && <ProviderBadge provider="fal" />}
                        <span>{model.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {model.credits}c
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {model.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Model Capabilities & Compatibility Checklist */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                Engine Compatibility Evaluation
              </span>
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                {selectedModel.name}
              </span>
            </div>

            <div className="space-y-2">
              {compatibilityChecks.map((check, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  {check.passed ? (
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{check.label}:</span>{' '}
                    <span className={check.passed ? 'text-slate-600 dark:text-slate-400' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                      {check.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credit Accounting Preview */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-sm text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-amber-500" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Generation Cost:</span>
                <span className="ml-1.5 font-mono text-slate-700 dark:text-slate-300">{creditCost} credits</span>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="text-slate-500">Available: </span>
              <span className={hasSufficientCredits ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                {userCredits} credits
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isLaunching}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Back to Plan
          </button>

          <button
            type="button"
            onClick={() => onLaunchExecution(selectedModelId)}
            disabled={!hasSufficientCredits || isLaunching}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-sm shadow-sm flex items-center gap-2 transition-colors cursor-pointer font-sans"
          >
            <Sparkles size={14} />
            <span>Freeze Snapshot & Launch Generation</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
