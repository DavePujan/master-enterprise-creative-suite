/**
 * Ad Director Frontend API Client.
 * Communicates with /api/ad-director/adspec/* endpoints for canonical AdSpec retrieval,
 * validation, atomic operations, surgical revisions, continuity reports, version lineage,
 * and execution snapshot creation.
 */

import { apiClient } from '../../../infrastructure/api/apiClient.js';
import type {
  AdSpec,
  ExecutionSnapshot,
  AdSpecPatch
} from '@shared-types/adSpec.js';
import type {
  DirectorOperation,
  AdSpecDiff,
  ChangeImpactAnalysis,
  ContinuityReport
} from '@shared-types/directorOperations.js';
import type {
  ValidateAdSpecResponse,
  InitDiscoveryResponse,
  AnswerDiscoveryResponse,
  GetDiscoveryStateResponse,
  ConfirmBriefResponse,
  AdBrief,
  CreativeConcept,
  GenerateConceptsResponse,
  GetConceptsResponse,
  SelectConceptResponse,
  RegenerateConceptsResponse,
  GenerateDirectorsPlanResponse,
  GetDirectorsPlanResponse,
  ConfirmDirectorsPlanResponse,
  ContinuityStatusReport,
  ProposeRevisionResponse,
  ApplyRevisionResponse,
  ProposedRevisionOperation,
  ModelCapability,
  ProjectCompatibilityReport,
  ShotCompatibilityReport,
  AdProjectExecutionPlan,
  CompiledShotExecutionPayload,
  ProviderStatusReport,
  ProviderExecutionRequest
} from '@contracts/adSpecContracts.js';
import type {
  LaunchExecutionRequest,
  LaunchExecutionResponse,
  ExecutionStatusResponse,
  ShotJobDetail,
  CancelExecutionResponse,
  RetryShotResponse,
  ExecutionSummaryItem
} from '@contracts/executionQueueContracts.js';
import type {
  VideoQAResult,
  ShotQaHistoryResponse,
  ExecutionQaSummaryResponse,
  RepairPlan
} from '@contracts/videoQaContracts.js';
import type {
  AssemblySpec,
  AssemblyValidationReport,
  RenderJobRecord,
  ExportVariantRecord,
  CreateAssemblyResponse,
  RenderAssemblyRequest,
  RenderAssemblyResponse,
  AssemblyRenderStatusResponse,
  AssemblyExportsResponse,
  RequestExportVariantRequest,
  CancelRenderResponse
} from '@contracts/videoAssemblyContracts.js';
import type { DirectorStage } from '@contracts/directorStageContracts.js';

export interface ApplyOperationResponse {
  success: boolean;
  adSpec: AdSpec;
  diff: AdSpecDiff;
  previousVersion: number;
  newVersion: number;
}

export interface ReviseAdSpecResponse {
  success: boolean;
  adSpec: AdSpec;
  diff: AdSpecDiff;
  impact: ChangeImpactAnalysis;
  previousVersion: number;
  newVersion: number;
}

export interface CreateAdSpecResponse {
  adSpec: AdSpec;
}

export interface AdSpecVersionRecord {
  adId: string;
  versionNumber: number;
  spec: AdSpec;
  diffSummary?: string;
  createdAt: string;
}

export class AdDirectorClient {
  /**
   * Retrieves the active canonical AdSpec for an adId.
   */
  async getAdSpec(adId: string): Promise<{ adSpec: AdSpec }> {
    return apiClient.get<{ adSpec: AdSpec }>(`/api/ad-director/adspec/${adId}`);
  }

  /**
   * Creates a new AdSpec project.
   */
  async createAdSpec(title: string, brief?: any): Promise<CreateAdSpecResponse> {
    return apiClient.post<CreateAdSpecResponse>('/api/ad-director/adspec', {
      title,
      brief
    });
  }

  /**
   * Retrieves a specific historical version of an AdSpec.
   */
  async getAdSpecVersion(adId: string, specVersion: number): Promise<AdSpecVersionRecord> {
    return apiClient.get<AdSpecVersionRecord>(`/api/ad-director/adspec/${adId}/versions/${specVersion}`);
  }

  /**
   * Validates an AdSpec with deterministic checks and freshness metadata.
   */
  async validateAdSpec(adSpec: AdSpec): Promise<ValidateAdSpecResponse> {
    return apiClient.post<ValidateAdSpecResponse>('/api/ad-director/adspec/validate', {
      adSpec
    });
  }

  /**
   * Applies a discrete DirectorOperation atomically to the AdSpec.
   */
  async applyOperation(adId: string, operation: DirectorOperation): Promise<ApplyOperationResponse> {
    return apiClient.post<ApplyOperationResponse>(`/api/ad-director/adspec/${adId}/operations`, {
      operation
    });
  }

  /**
   * Applies a surgical AdSpecPatch revision.
   */
  async applyPatchRevision(adId: string, patch: AdSpecPatch): Promise<ReviseAdSpecResponse> {
    return apiClient.post<ReviseAdSpecResponse>(`/api/ad-director/adspec/${adId}/revise`, {
      patch
    });
  }

  /**
   * Previews change impact of a proposed patch without applying it.
   */
  async analyzeImpact(adId: string, patch: AdSpecPatch): Promise<{ impact: ChangeImpactAnalysis }> {
    return apiClient.post<{ impact: ChangeImpactAnalysis }>(`/api/ad-director/adspec/${adId}/impact`, {
      patch
    });
  }

  /**
   * Evaluates machine-readable continuity invariants across shots.
   */
  async checkContinuity(adId: string): Promise<{ continuity: ContinuityReport }> {
    return apiClient.get<{ continuity: ContinuityReport }>(`/api/ad-director/adspec/${adId}/continuity`);
  }

  /**
   * Orchestrates a discrete reasoning stage (Interviewer, Creative Director, Story Architect, Shot Director, etc.).
   */
  async runStage(adId: string, stage: DirectorStage, payload?: any): Promise<{ operations: DirectorOperation[]; output: any }> {
    return apiClient.post<{ operations: DirectorOperation[]; output: any }>(
      `/api/ad-director/adspec/${adId}/stages/${stage}`,
      payload || {}
    );
  }

  /**
   * Approves the creative AdSpec (creativeState = 'approved').
   */
  async approveAdSpec(adId: string, specVersion: number): Promise<{ success: boolean; adId: string; specVersion: number; creativeState: string }> {
    return apiClient.post<{ success: boolean; adId: string; specVersion: number; creativeState: string }>(
      `/api/ad-director/adspec/${adId}/approve`,
      { specVersion }
    );
  }

  /**
   * Creates an immutable execution snapshot prior to launching video generation jobs.
   */
  async createSnapshot(adId: string, specVersion: number): Promise<{ snapshot: ExecutionSnapshot }> {
    return apiClient.post<{ snapshot: ExecutionSnapshot }>(
      `/api/ad-director/adspec/${adId}/snapshot`,
      { specVersion }
    );
  }

  // ===========================================================================
  // Phase 1: Normalized Video Ad Projects & Versioning
  // ===========================================================================

  async createVideoAdProject(title: string, initialSpec?: Partial<AdSpec>): Promise<{ project: any; adSpec: AdSpec }> {
    return apiClient.post<{ project: any; adSpec: AdSpec }>('/api/v1/ad-director/projects', {
      title,
      initialSpec,
    });
  }

  async getVideoAdProject(projectId: string): Promise<{ project: any; currentAdSpec: AdSpec; versionsCount: number }> {
    return apiClient.get<{ project: any; currentAdSpec: AdSpec; versionsCount: number }>(`/api/v1/ad-director/projects/${projectId}`);
  }

  async getVideoAdSpecVersion(projectId: string, versionNumber: number): Promise<{ adSpec: AdSpec }> {
    return apiClient.get<{ adSpec: AdSpec }>(`/api/v1/ad-director/projects/${projectId}/versions/${versionNumber}`);
  }

  async createVideoAdSpecVersion(projectId: string, spec: AdSpec, reason?: string): Promise<{ adSpec: AdSpec; versionNumber: number; contentHash: string }> {
    return apiClient.post<{ adSpec: AdSpec; versionNumber: number; contentHash: string }>(`/api/v1/ad-director/projects/${projectId}/versions`, {
      spec,
      reason,
    });
  }

  async listVideoAdSpecVersions(projectId: string): Promise<{ projectId: string; versions: any[] }> {
    return apiClient.get<{ projectId: string; versions: any[] }>(`/api/v1/ad-director/projects/${projectId}/versions`);
  }

  async approveVideoAdSpecVersion(projectId: string, versionNumber: number): Promise<{ success: boolean; projectId: string; versionNumber: number; status: string }> {
    return apiClient.post<{ success: boolean; projectId: string; versionNumber: number; status: string }>(`/api/v1/ad-director/projects/${projectId}/versions/${versionNumber}/approve`, {});
  }

  async createVideoAdExecutionSnapshot(projectId: string, versionNumber?: number, executionSettings?: Record<string, any>): Promise<{ snapshot: any }> {
    return apiClient.post<{ snapshot: any }>(`/api/v1/ad-director/projects/${projectId}/snapshots`, {
      versionNumber,
      executionSettings,
    });
  }

  // ===========================================================================
  // Phase 2: AI Interviewer / Discovery Engine
  // ===========================================================================

  async initDiscovery(projectId: string, initialPrompt: string, assetIds?: string[]): Promise<InitDiscoveryResponse> {
    return apiClient.post<InitDiscoveryResponse>(`/api/video/ad-projects/${projectId}/discovery`, {
      initialPrompt,
      assetIds,
    });
  }

  async answerDiscovery(projectId: string, answers: Array<{ questionId: string; answer: string | string[] }>): Promise<AnswerDiscoveryResponse> {
    return apiClient.post<AnswerDiscoveryResponse>(`/api/video/ad-projects/${projectId}/discovery/answer`, {
      answers,
    });
  }

  async getDiscoveryState(projectId: string): Promise<GetDiscoveryStateResponse> {
    return apiClient.get<GetDiscoveryStateResponse>(`/api/video/ad-projects/${projectId}/discovery`);
  }

  async confirmBrief(projectId: string, briefOverrides?: Partial<AdBrief>): Promise<ConfirmBriefResponse> {
    return apiClient.post<ConfirmBriefResponse>(`/api/video/ad-projects/${projectId}/brief/confirm`, {
      briefOverrides,
    });
  }

  // ===========================================================================
  // Phase 3: Creative Concept Engine
  // ===========================================================================

  async generateConcepts(projectId: string, targetCount?: number, creativeNotes?: string): Promise<GenerateConceptsResponse> {
    return apiClient.post<GenerateConceptsResponse>(`/api/video/ad-projects/${projectId}/concepts/generate`, {
      targetCount,
      creativeNotes,
    });
  }

  async getConcepts(projectId: string): Promise<GetConceptsResponse> {
    return apiClient.get<GetConceptsResponse>(`/api/video/ad-projects/${projectId}/concepts`);
  }

  async getConceptById(projectId: string, conceptId: string): Promise<{ concept: CreativeConcept }> {
    return apiClient.get<{ concept: CreativeConcept }>(`/api/video/ad-projects/${projectId}/concepts/${conceptId}`);
  }

  async selectConcept(projectId: string, conceptId: string, userRationale?: string): Promise<SelectConceptResponse> {
    return apiClient.post<SelectConceptResponse>(`/api/video/ad-projects/${projectId}/concepts/${conceptId}/select`, {
      userRationale,
    });
  }

  async regenerateConcepts(projectId: string, targetCount?: number, creativeNotes?: string, archivePrevious?: boolean): Promise<RegenerateConceptsResponse> {
    return apiClient.post<RegenerateConceptsResponse>(`/api/video/ad-projects/${projectId}/concepts/regenerate`, {
      targetCount,
      creativeNotes,
      archivePrevious,
    });
  }

  // ===========================================================================
  // Phase 4: Story Architect & Director's Plan
  // ===========================================================================

  async generateDirectorsPlan(
    projectId: string,
    targetDurationSeconds?: number,
    cinematographyStyle?: string,
    pacingPreference?: string
  ): Promise<GenerateDirectorsPlanResponse> {
    return apiClient.post<GenerateDirectorsPlanResponse>(`/api/video/ad-projects/${projectId}/director-plan/generate`, {
      targetDurationSeconds,
      cinematographyStyle,
      pacingPreference,
    });
  }

  async getDirectorsPlan(projectId: string): Promise<GetDirectorsPlanResponse> {
    return apiClient.get<GetDirectorsPlanResponse>(`/api/video/ad-projects/${projectId}/director-plan`);
  }

  async confirmDirectorsPlan(projectId: string, userNotes?: string): Promise<ConfirmDirectorsPlanResponse> {
    return apiClient.post<ConfirmDirectorsPlanResponse>(`/api/video/ad-projects/${projectId}/director-plan/confirm`, {
      userNotes,
    });
  }

  async getContinuityReport(projectId: string): Promise<{ continuityReport: ContinuityStatusReport }> {
    return apiClient.get<{ continuityReport: ContinuityStatusReport }>(`/api/video/ad-projects/${projectId}/director-plan/continuity`);
  }

  // ===========================================================================
  // Phase 5: Natural-Language Revision Engine
  // ===========================================================================

  async proposeRevision(
    projectId: string,
    instruction: string,
    targetScope?: string,
    targetEntityId?: string
  ): Promise<ProposeRevisionResponse> {
    return apiClient.post<ProposeRevisionResponse>(`/api/video/ad-projects/${projectId}/revision/propose`, {
      instruction,
      targetScope,
      targetEntityId
    });
  }

  async applyRevision(
    projectId: string,
    instruction: string,
    confirmedOperations?: ProposedRevisionOperation[],
    userRationale?: string
  ): Promise<ApplyRevisionResponse> {
    return apiClient.post<ApplyRevisionResponse>(`/api/video/ad-projects/${projectId}/revision/apply`, {
      instruction,
      confirmedOperations,
      userRationale
    });
  }

  // ===========================================================================
  // Phase 6: Model Capability Registry & Prompt Compiler
  // ===========================================================================

  async getAvailableModels(provider?: string): Promise<{ models: ModelCapability[] }> {
    const params = provider ? `?provider=${encodeURIComponent(provider)}` : '';
    return apiClient.get<{ models: ModelCapability[] }>(`/api/video/ad-projects/models${params}`);
  }

  async validateCompatibility(projectId: string, modelId: string): Promise<ProjectCompatibilityReport> {
    return apiClient.post<ProjectCompatibilityReport>(`/api/video/ad-projects/${projectId}/compatibility`, {
      modelId
    });
  }

  async compileExecutionPlan(
    projectId: string,
    modelId: string,
    options?: { resolution?: string; userPromptOverrides?: Record<string, string> }
  ): Promise<AdProjectExecutionPlan> {
    return apiClient.post<AdProjectExecutionPlan>(`/api/video/ad-projects/${projectId}/compile`, {
      modelId,
      ...options
    });
  }

  async compileShotPayload(
    projectId: string,
    shotId: string,
    modelId: string,
    options?: { resolution?: string; userPromptOverrides?: Record<string, string> }
  ): Promise<CompiledShotExecutionPayload> {
    return apiClient.post<CompiledShotExecutionPayload>(`/api/video/ad-projects/${projectId}/shots/${shotId}/compile`, {
      modelId,
      ...options
    });
  }

  // ===========================================================================
  // Phase 7: Provider Adapters (Google, Fal, Seedance-via-Fal)
  // ===========================================================================

  async getProviderStatuses(): Promise<{ providers: ProviderStatusReport[] }> {
    return apiClient.get<{ providers: ProviderStatusReport[] }>('/api/video/providers/status');
  }

  async testAdapterMapping(
    projectId: string,
    shotId: string,
    modelId: string
  ): Promise<{
    provider: string;
    model: string;
    shotId: string;
    request: ProviderExecutionRequest;
    preview: {
      googleMapping?: any;
      falMapping?: any;
      seedanceMapping?: any;
    };
  }> {
    return apiClient.post(`/api/video/ad-projects/${projectId}/shots/${shotId}/test-adapter`, {
      modelId
    });
  }

  // ===========================================================================
  // Phase 8: Execution Orchestrator & Durable Queue
  // ===========================================================================

  async launchProjectExecution(
    projectId: string,
    request: LaunchExecutionRequest
  ): Promise<LaunchExecutionResponse> {
    return apiClient.post<LaunchExecutionResponse>(`/api/video/ad-projects/${projectId}/generate`, request);
  }

  async getProjectExecutions(projectId: string): Promise<{ executions: ExecutionSummaryItem[] }> {
    return apiClient.get<{ executions: ExecutionSummaryItem[] }>(`/api/video/ad-projects/${projectId}/executions`);
  }

  async getExecutionStatus(executionId: string): Promise<ExecutionStatusResponse> {
    return apiClient.get<ExecutionStatusResponse>(`/api/video/executions/${executionId}`);
  }

  async getExecutionJobs(executionId: string): Promise<{ executionId: string; shots: ShotJobDetail[] }> {
    return apiClient.get<{ executionId: string; shots: ShotJobDetail[] }>(`/api/video/executions/${executionId}/jobs`);
  }

  async cancelExecution(executionId: string): Promise<CancelExecutionResponse> {
    return apiClient.post<CancelExecutionResponse>(`/api/video/executions/${executionId}/cancel`, {});
  }

  async retryShotExecution(executionId: string, shotId: string): Promise<RetryShotResponse> {
    return apiClient.post<RetryShotResponse>(`/api/video/executions/${executionId}/shots/${shotId}/retry`, {});
  }

  // ===========================================================================
  // Phase 9: Video QA Engine & Structured Repair Loop
  // ===========================================================================

  async evaluateShotQa(
    executionId: string,
    shotId: string,
    options?: { simulatedObservations?: Record<string, string>; forceReevaluate?: boolean }
  ): Promise<VideoQAResult> {
    return apiClient.post<VideoQAResult>(`/api/video/executions/${executionId}/shots/${shotId}/qa`, options || {});
  }

  async getShotQaHistory(executionId: string, shotId: string): Promise<ShotQaHistoryResponse> {
    return apiClient.get<ShotQaHistoryResponse>(`/api/video/executions/${executionId}/shots/${shotId}/qa`);
  }

  async getExecutionQaSummary(executionId: string): Promise<ExecutionQaSummaryResponse> {
    return apiClient.get<ExecutionQaSummaryResponse>(`/api/video/executions/${executionId}/qa`);
  }

  async getRepairPlan(repairPlanId: string): Promise<RepairPlan> {
    return apiClient.get<RepairPlan>(`/api/video/repair-plans/${repairPlanId}`);
  }

  async approveRepairPlan(repairPlanId: string): Promise<{ success: boolean; status: string }> {
    return apiClient.post<{ success: boolean; status: string }>(`/api/video/repair-plans/${repairPlanId}/approve`, {});
  }

  // ===========================================================================
  // Phase 10: Final Assembly + Render + Export + Delivery
  // ===========================================================================

  async createOrGetAssembly(executionId: string): Promise<CreateAssemblyResponse> {
    return apiClient.post<CreateAssemblyResponse>(`/api/video/executions/${executionId}/assembly`, {});
  }

  async getAssembly(executionId: string): Promise<CreateAssemblyResponse> {
    return apiClient.get<CreateAssemblyResponse>(`/api/video/executions/${executionId}/assembly`);
  }

  async enqueueRender(
    assemblyId: string,
    options?: RenderAssemblyRequest
  ): Promise<RenderAssemblyResponse> {
    return apiClient.post<RenderAssemblyResponse>(`/api/video/assemblies/${assemblyId}/render`, options || {});
  }

  async getAssemblyRenderStatus(assemblyId: string): Promise<AssemblyRenderStatusResponse> {
    return apiClient.get<AssemblyRenderStatusResponse>(`/api/video/assemblies/${assemblyId}/status`);
  }

  async getAssemblyExports(assemblyId: string): Promise<AssemblyExportsResponse> {
    return apiClient.get<AssemblyExportsResponse>(`/api/video/assemblies/${assemblyId}/exports`);
  }

  async requestExportVariant(
    assemblyId: string,
    request: RequestExportVariantRequest
  ): Promise<ExportVariantRecord> {
    return apiClient.post<ExportVariantRecord>(`/api/video/assemblies/${assemblyId}/exports`, request);
  }

  async cancelRender(assemblyId: string): Promise<CancelRenderResponse> {
    return apiClient.post<CancelRenderResponse>(`/api/video/assemblies/${assemblyId}/cancel`, {});
  }
}

export const adDirectorClient = new AdDirectorClient();



