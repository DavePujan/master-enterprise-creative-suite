import React, { useState } from 'react';
import {
  Layers,
  Copy,
  ArrowUpRight,
  ChevronLeft,
  Workflow,
  Sparkles,
  Download,
  Film,
  FileCode,
  CheckCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCampaignStrategy } from '../../context/CampaignStrategyContext.js';

interface ActivationStageProps {
  onLaunchGem: (gemId: string) => void;
  onExportAll: () => void;
}

export const ActivationStage: React.FC<ActivationStageProps> = ({ onLaunchGem, onExportAll }) => {
  const [state, dispatch] = useCampaignStrategy();
  const { activation, strategy } = state;
  const { downstreamBriefs } = activation;
  const { masterStrategy } = strategy;
  const [activeTab, setActiveTab] = useState<'adspec' | 'text' | 'image' | 'video' | 'audio' | 'deck'>('adspec');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!downstreamBriefs) {
    return (
      <div className="p-8 text-center text-slate-500">
        No downstream briefs compiled yet. Return to Strategy step to generate briefs.
      </div>
    );
  }

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      key="05_activate"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5 text-left"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-light tracking-tight text-slate-900 dark:text-white">
            05 Campaign Production Plan & Creative Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Canonical AdSpec v1 multi-shot specification and provider-neutral briefs across all Creative Gems.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded">
          {[
            { id: 'adspec', label: 'Canonical AdSpec v1' },
            { id: 'video', label: 'Video Gem' },
            { id: 'image', label: 'Image Gem' },
            { id: 'text', label: 'Text Gem' },
            { id: 'audio', label: 'Audio Gem' },
            { id: 'deck', label: 'Presentation Deck' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs px-3 py-1.5 rounded font-bold uppercase transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[58vh] overflow-y-auto pr-1 text-left space-y-4">
        {/* Dynamic 5-Tier Campaign Production Plan */}
        {masterStrategy?.productionPlan && (
          <div className="p-4 bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-rose-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  5-Tier Production Asset Architecture
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                Est. Production Cost: {masterStrategy.productionPlan.estimatedProductionCreditRange?.min ?? 38}–{masterStrategy.productionPlan.estimatedProductionCreditRange?.max ?? 54} Credits
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {Object.values(masterStrategy.productionPlan.tiers || {}).map((t, idx) => (
                <div key={idx} className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      {t.tierLabel}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold">
                      {t.assets?.length || 0} Assets Staged
                    </span>
                  </div>

                  {t.assets && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {t.assets.map(asset => (
                        <div key={asset.id} className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white text-[10px]">
                              {asset.title}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 uppercase">{asset.assetType}</span>
                          </div>
                          <div className="text-[9px] text-slate-500">{asset.targetChannel}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 1: CANONICAL ADSPEC V1 */}
        {activeTab === 'adspec' && downstreamBriefs.canonicalAdSpec && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Canonical AdSpec v1 • Video Gem Contract ({downstreamBriefs.canonicalAdSpec.shots?.length || 3} Shots)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(downstreamBriefs.canonicalAdSpec, null, 2), 'adspec')}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <Copy size={12} /> {copiedId === 'adspec' ? 'Copied JSON!' : 'Copy AdSpec JSON'}
                </button>
                <button
                  type="button"
                  onClick={() => onLaunchGem('cinematic-video')}
                  className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
                >
                  Launch in Video Gem (AdSpec v1) <ArrowUpRight size={12} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">Ad ID:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">{downstreamBriefs.canonicalAdSpec.identity?.adId}</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">Aspect Ratio / Platform:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-[11px]">{downstreamBriefs.canonicalAdSpec.brief?.aspectRatio} • {downstreamBriefs.canonicalAdSpec.brief?.platform}</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">Duration:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-[11px]">{downstreamBriefs.canonicalAdSpec.brief?.desiredDurationSeconds} seconds</span>
                </div>
              </div>

              {/* Multi-Shot Storyboard Grid */}
              <div className="space-y-2 pt-2">
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[10px] block">
                  Compiled Storyboard Shots ({downstreamBriefs.canonicalAdSpec.shots?.length || 0})
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {downstreamBriefs.canonicalAdSpec.shots?.map((shot: any, idx: number) => (
                    <div key={shot.shotId || idx} className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-500 font-mono text-[11px]">Shot {shot.shotNumber}: {shot.purpose}</span>
                        <span className="text-[10px] font-mono text-slate-400">{shot.durationSeconds}s</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium text-[11px]">{shot.subject?.action}</p>
                      <div className="text-[10px] space-y-0.5 text-slate-500 dark:text-slate-400">
                        <div><span className="font-semibold text-slate-700 dark:text-slate-300">Camera:</span> {shot.camera?.framing} • {shot.camera?.cameraMovement}</div>
                        <div><span className="font-semibold text-slate-700 dark:text-slate-300">Lighting:</span> {shot.lighting?.source}</div>
                        <div><span className="font-semibold text-slate-700 dark:text-slate-300">Audio:</span> {shot.audio?.dialogueOrVoiceover}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VIDEO GEM */}
        {activeTab === 'video' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Video Scene Brief ({downstreamBriefs.videoBrief.shotPurpose})
              </span>
              <button
                type="button"
                onClick={() => onLaunchGem('cinematic-video')}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
              >
                Open in Video Gem <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-3">
              <p className="text-slate-700 dark:text-slate-300 font-medium">{downstreamBriefs.videoBrief.sceneDescription}</p>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                {downstreamBriefs.videoBrief.textlessPrompt}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: IMAGE GEM */}
        {activeTab === 'image' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Image Hero Shot Brief
              </span>
              <button
                type="button"
                onClick={() => onLaunchGem('standard-image')}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
              >
                Open in Image Gem <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-3">
              <p className="text-slate-700 dark:text-slate-300 font-medium">{downstreamBriefs.imageBrief.visualConcept}</p>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                {downstreamBriefs.imageBrief.textlessPrompt}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEXT GEM */}
        {activeTab === 'text' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Strategy Copy & Caption Brief
              </span>
              <button
                type="button"
                onClick={() => onLaunchGem('strategy-captions')}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
              >
                Open in Text Gem <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white">{downstreamBriefs.textBrief.coreHook}</h4>
              <p className="text-slate-700 dark:text-slate-300">{downstreamBriefs.textBrief.angle}</p>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIO GEM */}
        {activeTab === 'audio' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Audio Voiceover & Sonic Identity Brief
              </span>
              <button
                type="button"
                onClick={() => onLaunchGem('audio-studio')}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
              >
                Open in Audio Gem <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded space-y-3">
              <p className="text-slate-700 dark:text-slate-300 italic">"{downstreamBriefs.audioBrief.spokenScriptText}"</p>
              <div className="text-[10px] text-slate-500">Language: {downstreamBriefs.audioBrief.language} • Style: {downstreamBriefs.audioBrief.performanceStyle}</div>
            </div>
          </div>
        )}

        {/* TAB 6: PRESENTATION DECK */}
        {activeTab === 'deck' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Campaign Deck Brief ({downstreamBriefs.deckBrief.slides?.length || 0} Slides)
              </span>
              <button
                type="button"
                onClick={() => onLaunchGem('corporate-presentations')}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded shadow-xs cursor-pointer transition-all"
              >
                Open in Presentation Gem <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {downstreamBriefs.deckBrief.slides?.map(s => (
                <div key={s.slideNumber} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-rose-500 font-mono text-[10px]">Slide {s.slideNumber}: {s.slideTitle}</span>
                  <p className="text-slate-700 dark:text-slate-300 text-[11px] mt-0.5">{s.executiveTakeaway}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_JOURNEY_STEP', payload: '04_build_strategy' })}
          className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
        >
          <ChevronLeft size={16} /> Back to Master Strategy
        </button>

        <button
          type="button"
          onClick={onExportAll}
          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2 cursor-pointer shadow-md font-sans"
        >
          <Download size={14} />
          Export All Briefs & AdSpec JSON
        </button>
      </div>
    </motion.div>
  );
};
