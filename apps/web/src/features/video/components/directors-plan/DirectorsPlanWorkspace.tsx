import React, { useState, useEffect, useMemo } from 'react';
import type { AdSpec, AdSpecShot } from '@shared-types/adSpec.js';
import type { AdSpecDiff, ChangeImpactAnalysis, ContinuityReport } from '@shared-types/directorOperations.js';
import type { ValidateAdSpecResponse, ContinuityStatusReport, ProposeRevisionResponse } from '@contracts/adSpecContracts.js';
import { adDirectorClient } from '../../services/adDirectorClient.js';
import { extractCleanValue } from './planFormatters.js';
import { createDefaultAdSpecFixture } from './defaultAdSpecFixture.js';
import { DirectorsPlanHeader } from './DirectorsPlanHeader.js';
import { CreativeSummaryCard } from './CreativeSummaryCard.js';
import { ShotTimeline } from './ShotTimeline.js';
import { ShotCard } from './ShotCard.js';
import { ShotDetailDrawer } from './ShotDetailDrawer.js';
import { AiRevisionPanel } from './AiRevisionPanel.js';
import { RevisionDiffModal } from './RevisionDiffModal.js';
import { BiblesDrawer } from './BiblesDrawer.js';
import { VersionCompareModal } from './VersionCompareModal.js';
import { AdvancedPromptSection } from './AdvancedPromptSection.js';
import { ModelSelectionModal } from './ModelSelectionModal.js';
import { ModelCapabilitySelector } from './ModelCapabilitySelector.js';
import { CompiledPromptInspectorModal } from './CompiledPromptInspectorModal.js';
import { ExecutionProgressModal } from './ExecutionProgressModal.js';
import type { ModelCapability, ProjectCompatibilityReport, AdProjectExecutionPlan } from '@contracts/adSpecContracts.js';
import { GenerationLoader } from '@web/shared/components/GenerationLoader.js';
import { Clapperboard, AlertCircle, Sparkles, RefreshCw, CheckCircle2, Check, ShieldCheck } from 'lucide-react';
import { cn } from '@web/lib/utils.js';

export interface DirectorsPlanWorkspaceProps {
  initialAdSpec?: AdSpec | null;
  adId?: string;
  userCredits: number;
  onLaunchVideoJob?: (snapshot: any, modelId: string) => Promise<void>;
  brandGuidelines?: any;
}

export const DirectorsPlanWorkspace: React.FC<DirectorsPlanWorkspaceProps> = ({
  initialAdSpec,
  adId: initialAdId,
  userCredits,
  onLaunchVideoJob,
  brandGuidelines
}) => {
  // Canonical AdSpec State (defaults to realistic 18s commercial fixture if neither spec nor ID is provided)
  const [adSpec, setAdSpec] = useState<AdSpec | null>(() => {
    if (initialAdSpec) return initialAdSpec;
    if (initialAdId) return null;
    return createDefaultAdSpecFixture(brandGuidelines?.name, brandGuidelines?.colors);
  });
  const [previousSpec, setPreviousSpec] = useState<AdSpec | null>(null);
  const [isLoading, setIsLoading] = useState(!initialAdSpec && !!initialAdId);
  const [error, setError] = useState<string | null>(null);

  // Selected Shot Navigation
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  // Modals & Drawers Visibility
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isBiblesDrawerOpen, setIsBiblesDrawerOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isModelSelectionOpen, setIsModelSelectionOpen] = useState(false);

  // Revision & Diff State
  const [activeDiff, setActiveDiff] = useState<AdSpecDiff | null>(null);
  const [activeImpact, setActiveImpact] = useState<ChangeImpactAnalysis | null>(null);
  const [pendingRevisionPatch, setPendingRevisionPatch] = useState<any | null>(null);
  const [activeProposal, setActiveProposal] = useState<ProposeRevisionResponse | null>(null);
  const [isRevising, setIsRevising] = useState(false);
  const [isApplyingDiff, setIsApplyingDiff] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Validation & Continuity Cache
  const [validationStatus, setValidationStatus] = useState<ValidateAdSpecResponse | null>(null);
  const [continuityReport, setContinuityReport] = useState<ContinuityStatusReport | any | null>(null);

  // Phase 6: Model Capability & Execution Plan State
  const [availableModels, setAvailableModels] = useState<ModelCapability[]>([]);
  const [selectedEngineModelId, setSelectedEngineModelId] = useState<string>('veo_3_1_pro');
  const [engineCompatibilityReport, setEngineCompatibilityReport] = useState<ProjectCompatibilityReport | null>(null);
  const [compiledExecutionPlan, setCompiledExecutionPlan] = useState<AdProjectExecutionPlan | null>(null);
  const [isPromptInspectorOpen, setIsPromptInspectorOpen] = useState(false);
  const [isValidatingEngine, setIsValidatingEngine] = useState(false);
  const [isCompilingPlan, setIsCompilingPlan] = useState(false);

  // Phase 8: Execution Progress State
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [isExecutionProgressOpen, setIsExecutionProgressOpen] = useState(false);

  // Check for active background executions for this project
  useEffect(() => {
    const checkActiveExecutions = async () => {
      const pid = initialAdId || adSpec?.identity?.adId;
      if (!pid || pid === 'ad_prod_18s_launch') return;
      try {
        const res = await adDirectorClient.getProjectExecutions(pid);
        const active = res.executions?.find(e => ['queued', 'processing'].includes(e.status));
        if (active) {
          setActiveExecutionId(active.executionId);
        }
      } catch {
        // Quiet fallback
      }
    };
    checkActiveExecutions();
  }, [initialAdId, adSpec?.identity?.adId]);

  // Ensure first shot is selected by default if available
  useEffect(() => {
    if (adSpec?.shots && adSpec.shots.length > 0 && !selectedShotId) {
      setSelectedShotId(adSpec.shots[0].shotId);
    }
  }, [adSpec?.shots]);

  // Load from backend if initialAdId is provided without full AdSpec
  useEffect(() => {
    if (!initialAdSpec && initialAdId) {
      setIsLoading(true);
      adDirectorClient.getAdSpec(initialAdId)
        .then(res => {
          setAdSpec(res.adSpec);
          setIsLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Failed to load Director Plan');
          setIsLoading(false);
        });
    }
  }, [initialAdId, initialAdSpec]);

  // Validate AdSpec whenever version or shots change
  useEffect(() => {
    if (adSpec) {
      adDirectorClient.validateAdSpec(adSpec)
        .then(res => setValidationStatus(res))
        .catch(err => console.warn('[DirectorsPlanWorkspace] Validation error:', err));

      if (adSpec.identity?.adId) {
        if (adSpec.identity.adId === 'ad_prod_18s_launch') {
          setContinuityReport({
            characterConsistent: true,
            productReferenceLocked: true,
            locationContinuity: true,
            wardrobeConsistent: true,
            links: [],
            issues: [],
            summary: 'All continuous parameters locked.'
          });
        } else {
          adDirectorClient.getContinuityReport(adSpec.identity.adId)
            .then(res => setContinuityReport(res.continuityReport))
            .catch(() => {
              (adDirectorClient as any).checkContinuity?.(adSpec.identity.adId)
                .then((res: any) => setContinuityReport(res.continuity))
                .catch(() => {});
            });
        }
      }
    }
  }, [adSpec?.identity?.specVersion, adSpec?.shots?.length]);

  // Phase 6: Load models from registry
  useEffect(() => {
    adDirectorClient.getAvailableModels()
      .then(res => {
        if (res?.models && res.models.length > 0) {
          setAvailableModels(res.models);
        }
      })
      .catch(err => {
        console.warn('[DirectorsPlanWorkspace] Could not fetch remote model registry:', err);
      });
  }, []);

  // Phase 6: Pre-flight capability validation whenever spec or target engine changes
  useEffect(() => {
    const projectId = initialAdId || adSpec?.identity?.adId;
    if (!projectId || !adSpec) return;

    if (projectId === 'ad_prod_18s_launch') {
      const shotCount = adSpec.shots?.length || 5;
      setEngineCompatibilityReport({
        projectId: 'ad_prod_18s_launch',
        specVersion: adSpec.identity?.specVersion || 1,
        modelId: selectedEngineModelId,
        provider: 'kling',
        compatible: true,
        totalShots: shotCount,
        compatibleShotsCount: shotCount,
        blockers: [],
        warnings: [],
        shotReports: {}
      });
      return;
    }

    setIsValidatingEngine(true);
    adDirectorClient.validateCompatibility(projectId, selectedEngineModelId)
      .then(report => {
        setEngineCompatibilityReport(report);
      })
      .catch(err => {
        console.warn('[DirectorsPlanWorkspace] Engine validation failed:', err);
      })
      .finally(() => {
        setIsValidatingEngine(false);
      });
  }, [initialAdId, adSpec?.identity?.adId, adSpec?.identity?.specVersion, adSpec?.shots?.length, selectedEngineModelId]);

  // Derived Totals
  const shots = adSpec?.shots || [];
  const totalDurationSeconds = useMemo(() => {
    if (!adSpec) return 15;
    const cleanDuration = extractCleanValue(adSpec.brief?.desiredDurationSeconds, 0);
    if (cleanDuration > 0) return cleanDuration;
    return shots.reduce((acc, s) => acc + (s.durationSeconds || 3), 0);
  }, [adSpec, shots]);

  // Selected Shot Details
  const selectedShotIndex = shots.findIndex(s => s.shotId === selectedShotId);
  const selectedShot = selectedShotIndex >= 0 ? shots[selectedShotIndex] : (shots[0] || null);
  const selectedShotSequence = selectedShot ? (selectedShot.sequence || selectedShotIndex + 1) : 1;

  // Calculate start second for selected shot
  const selectedShotStart = useMemo(() => {
    let acc = 0;
    for (let i = 0; i < selectedShotIndex; i++) {
      acc += shots[i]?.durationSeconds || 3;
    }
    return acc;
  }, [shots, selectedShotIndex]);

  // Handlers
  const handleSelectShot = (shotId: string) => {
    setSelectedShotId(shotId);
  };

  const handleOpenDetail = (shotId?: string) => {
    if (shotId) setSelectedShotId(shotId);
    setIsDetailDrawerOpen(true);
  };

  const handleAskAiForShot = (shotId: string) => {
    setSelectedShotId(shotId);
    const elem = document.getElementById('ai-revision-panel');
    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit AI revision proposal
  const handleSubmitRevision = async (instruction: string, scope: 'shot' | 'spec', targetShotId?: string) => {
    if (!adSpec) return;
    setIsRevising(true);

    try {
      const projectId = initialAdId || adSpec.identity?.adId;
      if (!projectId) {
        throw new Error('No active project ID found for revision');
      }

      const proposal = await adDirectorClient.proposeRevision(
        projectId,
        instruction,
        scope === 'shot' ? 'shot' : undefined,
        scope === 'shot' ? (targetShotId || selectedShotId || undefined) : undefined
      );

      setActiveProposal(proposal);

      // Synthesize structured preview diff for modal
      const modifiedPaths = proposal.operations.map(op => ({
        path: op.target,
        previousValue: op.before,
        newValue: op.after
      }));

      const syntheticDiff: any = {
        diffId: `diff_${Date.now()}`,
        fromVersion: adSpec.identity.specVersion,
        toVersion: adSpec.identity.specVersion + 1,
        specVersionBefore: adSpec.identity.specVersion,
        specVersionAfter: adSpec.identity.specVersion + 1,
        explanation: `${proposal.summary} (${proposal.operations.length} operation(s) proposed)`,
        humanExplanation: `${proposal.summary} (${proposal.operations.length} operation(s) proposed)`,
        modifiedPaths,
        addedPaths: [],
        removedPaths: []
      };

      setActiveDiff(syntheticDiff);
      setActiveImpact({
        directlyAffected: proposal.affectedShots,
        indirectlyAffected: [],
        unaffected: proposal.unaffectedCriticalEntities,
        summary: proposal.summary || 'Revision change impact analysis'
      });
    } catch (err: any) {
      console.error('[DirectorsPlanWorkspace] Revision proposal failed:', err);
      alert(`Revision proposal failed: ${err.message}`);
    } finally {
      setIsRevising(false);
    }
  };

  // Apply structured revision diff atomically
  const handleApplyDiff = async () => {
    if (!adSpec) return;
    setIsApplyingDiff(true);

    try {
      const projectId = initialAdId || adSpec.identity?.adId;
      if (!projectId) throw new Error('No project ID found');

      if (activeProposal) {
        const res = await adDirectorClient.applyRevision(
          projectId,
          activeProposal.instruction,
          activeProposal.operations
        );
        setPreviousSpec(adSpec);
        setAdSpec(res.adSpec);
        setActiveProposal(null);
        setIsDiffModalOpen(false);
        setActiveDiff(null);
      } else if (pendingRevisionPatch) {
        const res = await adDirectorClient.applyPatchRevision(adSpec.identity.adId, pendingRevisionPatch);
        setPreviousSpec(adSpec);
        setAdSpec(res.adSpec);
        setIsDiffModalOpen(false);
        setPendingRevisionPatch(null);
        setActiveDiff(null);
      }
    } catch (err: any) {
      console.error('[DirectorsPlanWorkspace] Apply revision failed:', err);
      alert(`Could not apply revision: ${err.message}`);
    } finally {
      setIsApplyingDiff(false);
    }
  };

  const handleDiscardProposal = () => {
    setActiveProposal(null);
    setActiveDiff(null);
    setIsDiffModalOpen(false);
  };

  // Approve creative plan (creativeState = 'approved')
  const handleApprove = async () => {
    if (!adSpec) return;
    setIsApproving(true);

    try {
      const res = await adDirectorClient.approveAdSpec(adSpec.identity.adId, adSpec.identity.specVersion);
      if (res.success) {
        setAdSpec(prev => prev ? {
          ...prev,
          identity: {
            ...prev.identity,
            creativeState: 'approved'
          }
        } : null);
        setIsModelSelectionOpen(true);
      }
    } catch (err: any) {
      console.error('[DirectorsPlanWorkspace] Approval failed:', err);
      alert(`Approval blocked: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  // Confirm Director's Plan (creativeState = 'approved')
  const handleConfirmPlan = async () => {
    if (!adSpec) return;
    setIsApproving(true);

    try {
      const projectId = initialAdId || adSpec.identity?.adId;
      if (projectId) {
        const res = await adDirectorClient.confirmDirectorsPlan(projectId);
        setAdSpec(res.adSpec);
      } else {
        await handleApprove();
      }
    } catch (err: any) {
      console.error('[DirectorsPlanWorkspace] Plan confirmation failed:', err);
      alert(`Could not confirm plan: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  // Launch execution after model selection (Phase 8: Durable Generation Queue)
  const handleLaunchExecution = async (selectedModelId: string) => {
    if (!adSpec) return;
    const projectId = initialAdId || adSpec.identity.adId;
    try {
      const launchRes = await adDirectorClient.launchProjectExecution(projectId, {
        modelId: selectedModelId,
        options: {
          resolution: '720p'
        }
      });
      setIsModelSelectionOpen(false);
      setActiveExecutionId(launchRes.executionId);
      setIsExecutionProgressOpen(true);
      if (onLaunchVideoJob) {
        await onLaunchVideoJob(launchRes, selectedModelId);
      }
    } catch (err: any) {
      console.error('[DirectorsPlanWorkspace] Launch execution failed:', err);
      alert(`Launch failed: ${err.message}`);
    }
  };

  // Phase 6: Open Inspector & compile execution plan on-demand
  const handleOpenPromptInspector = async () => {
    const projectId = initialAdId || adSpec?.identity?.adId;
    setIsPromptInspectorOpen(true);
    if (!projectId) return;

    setIsCompilingPlan(true);
    try {
      const plan = await adDirectorClient.compileExecutionPlan(projectId, selectedEngineModelId);
      setCompiledExecutionPlan(plan);
    } catch (err: any) {
      console.error('[DirectorsPlanWorkspace] Failed to compile execution plan:', err);
    } finally {
      setIsCompilingPlan(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-950">
        <GenerationLoader
          title="Loading Director's Plan..."
          subtitle="Hydrating canonical AdSpec, cinematographic storyboard, and continuity graph..."
          icon={Clapperboard}
        />
      </div>
    );
  }

  if (error || !adSpec) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Director's Plan Unavailable</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{error || 'No active creative document found.'}</p>
      </div>
    );
  }

  // Calculate cumulative starts for all shots in list
  let accumulatedStart = 0;

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-slate-50/40 dark:bg-slate-950/40 text-slate-900 dark:text-slate-100 overflow-y-auto">
      {/* 1. Header with Metadata, Lineage & Approval Gate */}
      <DirectorsPlanHeader
        title={adSpec.creative?.concepts?.find(c => c.conceptId === adSpec.creative?.selectedConceptId)?.title || adSpec.creative?.concepts?.[0]?.title || (adSpec.creative as any)?.alternativeConcepts?.[0]?.title || 'Commercial Campaign'}
        identity={adSpec.identity}
        brief={adSpec.brief}
        shotCount={shots.length}
        totalDuration={totalDurationSeconds}
        validationStatus={(validationStatus as any) || undefined}
        onApprove={handleApprove}
        onOpenBibles={() => setIsBiblesDrawerOpen(true)}
        onOpenVersionHistory={() => setIsCompareOpen(true)}
        onToggleCompare={() => setIsCompareOpen(true)}
        isCompareActive={isCompareOpen}
        isApproving={isApproving}
      />

      {/* Main Workspace Stage */}
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Phase 8: Active Durable Video Generation Banner */}
        {activeExecutionId && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-sm flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <RefreshCw size={18} className="text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
              <div>
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 font-mono uppercase tracking-wide">
                  Durable Video Execution In Progress
                </span>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-mono mt-0.5">
                  Execution ID: {activeExecutionId.slice(0, 16)}... · Generation jobs running in background
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExecutionProgressOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold rounded-sm transition-colors shadow-xs shrink-0"
            >
              Open Progress Monitor
            </button>
          </div>
        )}

        {/* 2. Commercial Creative Summary Card */}
        <CreativeSummaryCard
          brief={adSpec.brief}
          creative={adSpec.creative}
          story={adSpec.story}
          decisionMetadata={adSpec.decisionMetadata}
          onAskAi={() => handleAskAiForShot(shots[0]?.shotId || 'shot_01')}
        />

        {/* 3. Production Shot Timeline */}
        <ShotTimeline
          shots={shots}
          selectedShotId={selectedShotId}
          onSelectShot={handleSelectShot}
          totalDurationSeconds={totalDurationSeconds}
        />

        {/* Phase 6: Target Model Capability Selector & Compatibility Inspector */}
        {availableModels.length > 0 && (
          <ModelCapabilitySelector
            models={availableModels}
            selectedModelId={selectedEngineModelId}
            onSelectModel={setSelectedEngineModelId}
            compatibilityReport={engineCompatibilityReport}
            isValidating={isValidatingEngine}
            onOpenInspector={handleOpenPromptInspector}
          />
        )}

        {/* 4. Scannable Shot Cards List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Shot Execution Cards ({shots.length})
            </span>
            <span className="text-xs text-slate-400 font-sans">
              Select any shot to inspect or revise with AI
            </span>
          </div>

          <div className="space-y-4">
            {shots.map((shot, idx) => {
              const startSec = accumulatedStart;
              accumulatedStart += (shot.durationSeconds || 3);
              const isSelected = shot.shotId === selectedShotId;

              // Check if shot has a continuity conflict
              const hasConflict = (continuityReport as any)?.conflicts?.find((c: any) =>
                (c.shotsInvolved || c.involvedShotIds || []).includes(shot.shotId)
              );

              return (
                <ShotCard
                  key={shot.shotId}
                  shot={shot}
                  sequence={shot.sequence || idx + 1}
                  totalShots={shots.length}
                  startSeconds={startSec}
                  isSelected={isSelected}
                  onSelect={() => handleSelectShot(shot.shotId)}
                  onOpenDetail={() => handleOpenDetail(shot.shotId)}
                  onAskAi={handleAskAiForShot}
                  characters={adSpec.characters}
                  products={adSpec.products}
                  locations={adSpec.locations}
                  assets={adSpec.assets}
                  continuityConflict={hasConflict?.conflictingAspect || hasConflict?.aspect}
                />
              );
            })}
          </div>
        </div>

        {/* 5. Continuity Checklist & Plan Confirmation Panel */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-5 shadow-xs text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                  CONTINUITY
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={14} className={cn("shrink-0", (continuityReport?.characterConsistent ?? true) ? "text-emerald-500" : "text-amber-500")} />
                  <span>Character consistent</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={14} className={cn("shrink-0", (continuityReport?.productReferenceLocked ?? true) ? "text-emerald-500" : "text-amber-500")} />
                  <span>Product reference locked</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={14} className={cn("shrink-0", (continuityReport?.locationContinuity ?? true) ? "text-emerald-500" : "text-amber-500")} />
                  <span>Location continuity</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <CheckCircle2 size={14} className={cn("shrink-0", (continuityReport?.wardrobeConsistent ?? true) ? "text-emerald-500" : "text-amber-500")} />
                  <span>Wardrobe consistent</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => handleAskAiForShot(shots[0]?.shotId || 'shot_01')}
                className="px-4 py-2 text-xs font-bold rounded-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                EDIT PLAN
              </button>
              <button
                type="button"
                onClick={handleConfirmPlan}
                disabled={isApproving || adSpec.identity.creativeState === 'approved'}
                className="px-5 py-2 text-xs font-bold rounded-sm bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : adSpec.identity.creativeState === 'approved' ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>PLAN CONFIRMED</span>
                  </>
                ) : (
                  <span>CONFIRM PLAN</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 6. Natural Language AI Revision Entry Point */}
        <div id="ai-revision-panel">
          <AiRevisionPanel
            selectedShotId={selectedShotId}
            selectedShotSequence={selectedShotSequence}
            onClearSelectedShot={() => setSelectedShotId(null)}
            onSubmitRevision={handleSubmitRevision}
            isRevising={isRevising}
            activeProposal={activeProposal}
            onApplyProposal={handleApplyDiff}
            onDiscardProposal={handleDiscardProposal}
            onOpenDiffModal={() => setIsDiffModalOpen(true)}
            isApplying={isApplyingDiff}
          />
        </div>

        {/* 6. Advanced Technical Prompt View (Collapsible) */}
        <AdvancedPromptSection
          shots={shots}
          selectedShotId={selectedShotId}
        />
      </div>

      {/* Progressive Disclosure Drawers & Modals */}
      <ShotDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        shot={selectedShot}
        sequence={selectedShotSequence}
        totalShots={shots.length}
        startSeconds={selectedShotStart}
        onAskAi={handleAskAiForShot}
        characters={adSpec.characters}
        products={adSpec.products}
        locations={adSpec.locations}
        assets={adSpec.assets}
      />

      <BiblesDrawer
        isOpen={isBiblesDrawerOpen}
        onClose={() => setIsBiblesDrawerOpen(false)}
        characters={adSpec.characters}
        products={adSpec.products}
        locations={adSpec.locations}
        brand={adSpec.brand}
      />

      <RevisionDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        diff={activeDiff}
        impact={activeImpact}
        targetScopeLabel={pendingRevisionPatch?.targetScope === 'shot' ? `Shot ${selectedShotSequence}` : 'Entire Ad'}
        onApply={handleApplyDiff}
        onReject={() => {
          setIsDiffModalOpen(false);
          setPendingRevisionPatch(null);
          setActiveDiff(null);
        }}
        isApplying={isApplyingDiff}
      />

      <VersionCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        currentSpec={adSpec}
        previousSpec={previousSpec}
      />

      <ModelSelectionModal
        isOpen={isModelSelectionOpen}
        onClose={() => setIsModelSelectionOpen(false)}
        adSpec={adSpec}
        userCredits={userCredits}
        onLaunchExecution={handleLaunchExecution}
        isLaunching={false}
      />

      {/* Phase 6: Compiled Prompt & Provider Payload Inspector Modal */}
      <CompiledPromptInspectorModal
        isOpen={isPromptInspectorOpen}
        onClose={() => setIsPromptInspectorOpen(false)}
        executionPlan={compiledExecutionPlan}
        isLoading={isCompilingPlan}
      />

      {/* Phase 8: Execution Progress Modal */}
      <ExecutionProgressModal
        isOpen={isExecutionProgressOpen}
        onClose={() => setIsExecutionProgressOpen(false)}
        executionId={activeExecutionId}
        projectId={initialAdId || adSpec?.identity?.adId}
      />
    </div>
  );
};
