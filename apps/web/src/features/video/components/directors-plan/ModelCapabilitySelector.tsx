import React from 'react';
import type { ModelCapability, ProjectCompatibilityReport } from '@contracts/adSpecContracts.js';

interface ModelCapabilitySelectorProps {
  models: ModelCapability[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  compatibilityReport: ProjectCompatibilityReport | null;
  isValidating?: boolean;
  onOpenInspector?: () => void;
}

export const ModelCapabilitySelector: React.FC<ModelCapabilitySelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  compatibilityReport,
  isValidating,
  onOpenInspector
}) => {
  const selectedModel = models.find(m => m.model === selectedModelId) || models[0];

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'google': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'runway': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'kling': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'seedance': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'luma': return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Model selector & Capabilities */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Target Engine:</span>
            <select
              value={selectedModelId}
              onChange={(e) => onSelectModel(e.target.value)}
              className="bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-100 font-semibold text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              {models.map(m => (
                <option key={m.model} value={m.model}>
                  {m.displayName} ({m.provider.toUpperCase()}) - {m.credit_cost} credits
                </option>
              ))}
            </select>
          </div>

          {selectedModel && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${getProviderColor(selectedModel.provider)}`}>
                {selectedModel.provider}
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Durations: {(selectedModel.supported_durations || []).join(', ')}s
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                Max Refs: {selectedModel.max_references ?? 0}
              </span>
              {selectedModel.audio && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Audio
                </span>
              )}
              {selectedModel.last_frame && (
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                  Last-Frame
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Compatibility Status & Action */}
        <div className="flex items-center gap-3">
          {isValidating ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span>Verifying compatibility...</span>
            </div>
          ) : compatibilityReport ? (
            <div className="flex items-center gap-2">
              {compatibilityReport.compatible || (compatibilityReport as any).overallStatus === 'compatible' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>100% Compatible ({compatibilityReport.compatibleShotsCount ?? (compatibilityReport as any).summary?.compatibleShots ?? compatibilityReport.totalShots ?? 0}/{compatibilityReport.totalShots ?? (compatibilityReport as any).summary?.totalShots ?? 0} shots)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{(compatibilityReport.blockers || []).length} Compatibility Blocker(s)</span>
                </div>
              )}
            </div>
          ) : null}

          {onOpenInspector && (
            <button
              onClick={onOpenInspector}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>Compile Plan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
