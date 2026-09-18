/**
 * Ad Director Repository.
 * Handles persistence and retrieval of Director Plans and immutable version snapshots.
 * Integrates with Supabase (public.ad_director_plans, public.ad_director_versions)
 * with robust in-memory resilience for offline/test environments.
 */

import { getSupabaseAdmin } from '../../infrastructure/supabase/supabaseClient.js';
import type { DirectorPlan, PlanDelta } from '@shared-types/adDirector.js';
import type { AdSpec, ExecutionSnapshot } from '@shared-types/adSpec.js';
import type { VideoQAResult, RepairPlan, RepairPlanStatus } from '@contracts/videoQaContracts.js';
import type {
  AssemblyRecord,
  RenderJobRecord,
  ExportVariantRecord
} from '@contracts/videoAssemblyContracts.js';

export interface CreatePlanRecordParams {
  workspaceId: string;
  userId: string;
  plan: DirectorPlan;
}

export interface SavePlanVersionParams {
  planId: string;
  workspaceId: string;
  userId: string;
  plan: DirectorPlan;
  delta?: PlanDelta;
  isApproved?: boolean;
}

export class AdDirectorRepository {
  private memoryPlans = new Map<string, { root: any; versions: Map<number, any> }>();
  private memoryRepairPlans = new Map<string, any[]>();
  private memoryAssemblies = new Map<string, AssemblyRecord>();
  private memoryRenders = new Map<string, RenderJobRecord>();
  private memoryExports = new Map<string, ExportVariantRecord[]>();

  /**
   * Persists a newly initiated Director Plan and its initial v1 snapshot.
   */
  async createPlan(params: CreatePlanRecordParams): Promise<{ planId: string; versionId: string }> {
    const supabase = getSupabaseAdmin();
    const plan = params.plan;

    if (!supabase) {
      const planId = plan.id || `plan_${Date.now()}`;
      const versionId = `ver_${planId}_1`;
      const root = {
        id: planId,
        workspace_id: params.workspaceId,
        created_by: params.userId,
        title: plan.title,
        status: plan.status || 'draft',
        aspect_ratio: plan.aspectRatio || '16:9',
        target_platform: plan.targetPlatform || 'generic',
        current_version_number: 1,
        current_version_id: versionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const verMap = new Map<number, any>();
      verMap.set(1, {
        id: versionId,
        plan_id: planId,
        version_number: 1,
        plan_document: plan,
        patch_delta: null,
        is_approved: false,
        created_by: params.userId,
        created_at: new Date().toISOString()
      });

      this.memoryPlans.set(planId, { root, versions: verMap });
      return { planId, versionId };
    }

    // 1. Insert root plan
    const { data: rootData, error: rootError } = await supabase
      .from('ad_director_plans')
      .insert({
        id: plan.id,
        workspace_id: params.workspaceId,
        created_by: params.userId,
        title: plan.title,
        status: plan.status || 'draft',
        aspect_ratio: plan.aspectRatio || '16:9',
        target_platform: plan.targetPlatform || 'generic',
        current_version_number: 1
      })
      .select('id')
      .single();

    if (rootError || !rootData) {
      console.warn('AdDirectorRepository.createPlan fallback to memory:', rootError?.message);
      return this.createInMemory(params);
    }

    // 2. Insert initial version v1
    const { data: verData, error: verError } = await supabase
      .from('ad_director_versions')
      .insert({
        plan_id: rootData.id,
        version_number: 1,
        plan_document: plan,
        patch_delta: null,
        is_approved: false,
        created_by: params.userId
      })
      .select('id')
      .single();

    if (verError || !verData) {
      console.warn('AdDirectorRepository.createPlan version insert fallback:', verError?.message);
      return this.createInMemory(params);
    }

    // 3. Update root current_version_id
    await supabase
      .from('ad_director_plans')
      .update({ current_version_id: verData.id })
      .eq('id', rootData.id);

    return { planId: rootData.id, versionId: verData.id };
  }

  private createInMemory(params: CreatePlanRecordParams): { planId: string; versionId: string } {
    const planId = params.plan.id || `plan_${Date.now()}`;
    const versionId = `ver_${planId}_1`;
    const root = {
      id: planId,
      workspace_id: params.workspaceId,
      created_by: params.userId,
      title: params.plan.title,
      status: params.plan.status || 'draft',
      aspect_ratio: params.plan.aspectRatio || '16:9',
      target_platform: params.plan.targetPlatform || 'generic',
      current_version_number: 1,
      current_version_id: versionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const verMap = new Map<number, any>();
    verMap.set(1, {
      id: versionId,
      plan_id: planId,
      version_number: 1,
      plan_document: JSON.parse(JSON.stringify(params.plan)),
      patch_delta: null,
      is_approved: false,
      created_by: params.userId,
      created_at: new Date().toISOString()
    });
    this.memoryPlans.set(planId, { root, versions: verMap });
    return { planId, versionId };
  }

  private saveInMemory(params: SavePlanVersionParams): { versionId: string; versionNumber: number } {
    const verNumber = params.plan.version;
    let entry = this.memoryPlans.get(params.planId);
    if (!entry) {
      entry = {
        root: {
          id: params.planId,
          workspace_id: params.workspaceId,
          created_by: params.userId,
          title: params.plan.title,
          status: params.plan.status,
          aspect_ratio: params.plan.aspectRatio,
          target_platform: params.plan.targetPlatform,
          current_version_number: verNumber,
          updated_at: new Date().toISOString()
        },
        versions: new Map()
      };
      this.memoryPlans.set(params.planId, entry);
    }
    const versionId = `ver_${params.planId}_${verNumber}`;
    entry.root.current_version_number = verNumber;
    entry.root.current_version_id = versionId;
    entry.root.title = params.plan.title;
    entry.root.status = params.plan.status;
    entry.root.updated_at = new Date().toISOString();
    entry.versions.set(verNumber, {
      id: versionId,
      plan_id: params.planId,
      version_number: verNumber,
      plan_document: JSON.parse(JSON.stringify(params.plan)),
      patch_delta: params.delta ? JSON.parse(JSON.stringify(params.delta)) : null,
      is_approved: params.isApproved || false,
      created_by: params.userId,
      created_at: new Date().toISOString()
    });
    return { versionId, versionNumber: verNumber };
  }

  /**
   * Retrieves the current active version of a Director Plan.
   */
  async getPlan(planId: string, workspaceId: string): Promise<DirectorPlan | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      const entry = this.memoryPlans.get(planId);
      if (!entry || entry.root.workspace_id !== workspaceId) return null;
      const currentVer = entry.versions.get(entry.root.current_version_number);
      return currentVer?.plan_document || null;
    }

    const { data: root, error: rootErr } = await supabase
      .from('ad_director_plans')
      .select('id, workspace_id, current_version_number, current_version_id')
      .eq('id', planId)
      .eq('workspace_id', workspaceId)
      .single();

    if (rootErr || !root) {
      const entry = this.memoryPlans.get(planId);
      if (entry && entry.root.workspace_id === workspaceId) {
        const ver = entry.versions.get(entry.root.current_version_number);
        return ver?.plan_document || null;
      }
      return null;
    }

    const { data: ver, error: verErr } = await supabase
      .from('ad_director_versions')
      .select('plan_document')
      .eq('id', root.current_version_id)
      .single();

    if (verErr || !ver) return null;
    return ver.plan_document as DirectorPlan;
  }

  /**
   * Retrieves a specific immutable version of a Director Plan.
   */
  async getPlanVersion(
    planId: string,
    versionNumber: number,
    workspaceId: string
  ): Promise<{ plan: DirectorPlan; delta?: any; isApproved: boolean } | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      const entry = this.memoryPlans.get(planId);
      if (!entry || entry.root.workspace_id !== workspaceId) return null;
      const ver = entry.versions.get(versionNumber);
      if (!ver) return null;
      return {
        plan: JSON.parse(JSON.stringify(ver.plan_document)),
        delta: ver.patch_delta ? JSON.parse(JSON.stringify(ver.patch_delta)) : null,
        isApproved: ver.is_approved
      };
    }

    const { data: ver, error } = await supabase
      .from('ad_director_versions')
      .select('plan_document, patch_delta, is_approved, ad_director_plans!inner(workspace_id)')
      .eq('plan_id', planId)
      .eq('version_number', versionNumber)
      .single();

    if (error || !ver) {
      const entry = this.memoryPlans.get(planId);
      if (entry && entry.root.workspace_id === workspaceId) {
        const memoryVer = entry.versions.get(versionNumber);
        if (memoryVer) {
          return {
            plan: JSON.parse(JSON.stringify(memoryVer.plan_document)),
            delta: memoryVer.patch_delta ? JSON.parse(JSON.stringify(memoryVer.patch_delta)) : null,
            isApproved: memoryVer.is_approved
          };
        }
      }
      return null;
    }

    return {
      plan: ver.plan_document as DirectorPlan,
      delta: ver.patch_delta,
      isApproved: ver.is_approved
    };
  }

  /**
   * Saves an updated plan version with patch provenance delta.
   */
  async savePlanVersion(params: SavePlanVersionParams): Promise<{ versionId: string; versionNumber: number }> {
    const supabase = getSupabaseAdmin();
    const verNumber = params.plan.version;

    if (!supabase) {
      return this.saveInMemory(params);
    }

    // 1. Insert new version
    const { data: verData, error: verError } = await supabase
      .from('ad_director_versions')
      .insert({
        plan_id: params.planId,
        version_number: verNumber,
        plan_document: params.plan,
        patch_delta: params.delta || null,
        is_approved: params.isApproved || false,
        created_by: params.userId
      })
      .select('id')
      .single();

    if (verError || !verData) {
      console.warn('AdDirectorRepository.savePlanVersion fallback to memory:', verError?.message);
      return this.saveInMemory(params);
    }

    // 2. Update root plan pointer
    await supabase
      .from('ad_director_plans')
      .update({
        current_version_number: verNumber,
        current_version_id: verData.id,
        title: params.plan.title,
        status: params.plan.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.planId)
      .eq('workspace_id', params.workspaceId);

    return { versionId: verData.id, versionNumber: verNumber };
  }

  /**
   * Marks a specific version as approved.
   */
  async approvePlanVersion(planId: string, versionNumber: number, workspaceId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      const entry = this.memoryPlans.get(planId);
      if (!entry || entry.root.workspace_id !== workspaceId) return false;
      const ver = entry.versions.get(versionNumber);
      if (ver) {
        ver.is_approved = true;
        ver.plan_document.status = 'approved';
        entry.root.status = 'approved';
        return true;
      }
      return false;
    }

    const { error: verErr } = await supabase
      .from('ad_director_versions')
      .update({ is_approved: true })
      .eq('plan_id', planId)
      .eq('version_number', versionNumber);

    if (verErr) return false;

    await supabase
      .from('ad_director_plans')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('workspace_id', workspaceId);

  }

  // ===========================================================================
  // AdSpec v1 Persistence & Execution Snapshots
  // ===========================================================================

  private memoryAdSpecs = new Map<string, { root: any; versions: Map<number, any>; snapshots: Map<string, ExecutionSnapshot> }>();

  async createAdSpec(params: { workspaceId: string; userId: string; adSpec: AdSpec }): Promise<{ adId: string; specVersion: number }> {
    const { adId, specVersion } = params.adSpec.identity;
    const entry = {
      root: {
        adId,
        workspaceId: params.workspaceId,
        userId: params.userId,
        currentVersion: specVersion,
        title: params.adSpec.identity.title,
        status: params.adSpec.identity.creativeState,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      versions: new Map<number, any>(),
      snapshots: new Map<string, ExecutionSnapshot>()
    };

    entry.versions.set(specVersion, {
      adId,
      specVersion,
      adSpec: JSON.parse(JSON.stringify(params.adSpec)),
      delta: null,
      isApproved: params.adSpec.identity.creativeState === 'approved',
      createdAt: new Date().toISOString()
    });

    this.memoryAdSpecs.set(adId, entry);

    // Persist to Supabase if connected
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('ad_director_plans').insert({
          id: adId,
          workspace_id: params.workspaceId,
          created_by: params.userId,
          title: params.adSpec.identity.title,
          status: params.adSpec.identity.creativeState,
          aspect_ratio: params.adSpec.brief.aspectRatio,
          current_version_number: specVersion
        });
        await supabase.from('ad_director_versions').insert({
          plan_id: adId,
          version_number: specVersion,
          plan_document: params.adSpec,
          patch_delta: null,
          is_approved: params.adSpec.identity.creativeState === 'approved',
          created_by: params.userId
        });
      } catch (err) {
        console.warn('AdDirectorRepository.createAdSpec Supabase sync warning:', err);
      }
    }

    return { adId, specVersion };
  }

  async getAdSpec(adId: string, workspaceId: string): Promise<AdSpec | null> {
    const entry = this.memoryAdSpecs.get(adId);
    if (entry && entry.root.workspaceId === workspaceId) {
      const ver = entry.versions.get(entry.root.currentVersion);
      if (ver) return JSON.parse(JSON.stringify(ver.adSpec));
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data: ver } = await supabase
          .from('ad_director_versions')
          .select('plan_document')
          .eq('plan_id', adId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single();
        if (ver?.plan_document) return ver.plan_document as AdSpec;
      } catch {
        // Handled by in-memory fallback
      }
    }

    return null;
  }

  async getAdSpecVersion(adId: string, specVersion: number, workspaceId: string): Promise<{ adSpec: AdSpec; delta?: any; isApproved: boolean } | null> {
    const entry = this.memoryAdSpecs.get(adId);
    if (entry && entry.root.workspaceId === workspaceId) {
      const ver = entry.versions.get(specVersion);
      if (ver) {
        return {
          adSpec: JSON.parse(JSON.stringify(ver.adSpec)),
          delta: ver.delta ? JSON.parse(JSON.stringify(ver.delta)) : null,
          isApproved: ver.isApproved
        };
      }
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data: ver } = await supabase
          .from('ad_director_versions')
          .select('plan_document, patch_delta, is_approved')
          .eq('plan_id', adId)
          .eq('version_number', specVersion)
          .single();
        if (ver) {
          return {
            adSpec: ver.plan_document as AdSpec,
            delta: ver.patch_delta,
            isApproved: ver.is_approved
          };
        }
      } catch {
        // Fallback
      }
    }

    return null;
  }

  async saveAdSpecVersion(params: {
    adId: string;
    workspaceId: string;
    userId: string;
    adSpec: AdSpec;
    delta?: any;
    isApproved?: boolean;
  }): Promise<{ versionNumber: number }> {
    const verNumber = params.adSpec.identity.specVersion;
    let entry = this.memoryAdSpecs.get(params.adId);
    if (!entry) {
      entry = {
        root: {
          adId: params.adId,
          workspaceId: params.workspaceId,
          userId: params.userId,
          currentVersion: verNumber,
          title: params.adSpec.identity.title,
          status: params.adSpec.identity.creativeState,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        versions: new Map(),
        snapshots: new Map()
      };
      this.memoryAdSpecs.set(params.adId, entry);
    }

    entry.root.currentVersion = verNumber;
    entry.root.title = params.adSpec.identity.title;
    entry.root.status = params.adSpec.identity.creativeState;
    entry.root.updatedAt = new Date().toISOString();

    entry.versions.set(verNumber, {
      adId: params.adId,
      specVersion: verNumber,
      adSpec: JSON.parse(JSON.stringify(params.adSpec)),
      delta: params.delta ? JSON.parse(JSON.stringify(params.delta)) : null,
      isApproved: params.isApproved || false,
      createdAt: new Date().toISOString()
    });

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('ad_director_versions').insert({
          plan_id: params.adId,
          version_number: verNumber,
          plan_document: params.adSpec,
          patch_delta: params.delta || null,
          is_approved: params.isApproved || false,
          created_by: params.userId
        });
      } catch (err) {
        console.warn('AdDirectorRepository.saveAdSpecVersion Supabase fallback:', err);
      }
    }

    return { versionNumber: verNumber };
  }

  private memorySnapshots = new Map<string, ExecutionSnapshot>();
  private memoryExecutions = new Map<string, any>();
  private memoryRevisions = new Map<string, any[]>();
  private memoryPromptVersions = new Map<string, any[]>();
  private memoryProviderRuns = new Map<string, any[]>();
  private memoryGenerationResults = new Map<string, any[]>();
  private memoryQAResults = new Map<string, any[]>();

  async saveExecution(execution: any): Promise<void> {
    this.memoryExecutions.set(execution.executionId, JSON.parse(JSON.stringify(execution)));
  }

  async getExecution(executionId: string): Promise<any | null> {
    const exec = this.memoryExecutions.get(executionId);
    return exec ? JSON.parse(JSON.stringify(exec)) : null;
  }

  async saveExecutionSnapshot(snapshot: ExecutionSnapshot, workspaceId: string): Promise<void> {
    this.memorySnapshots.set(snapshot.snapshotId, JSON.parse(JSON.stringify(snapshot)));
    const entry = this.memoryAdSpecs.get(snapshot.adId);
    if (entry) {
      entry.snapshots.set(snapshot.snapshotId, JSON.parse(JSON.stringify(snapshot)));
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('ad_director_execution_snapshots').upsert({
          id: snapshot.snapshotId,
          plan_id: snapshot.adId,
          workspace_id: workspaceId,
          spec_version: snapshot.specVersion,
          spec_hash: snapshot.specHash || '',
          frozen_ad_spec: snapshot.frozenAdSpec,
          resolved_assets: snapshot.resolvedAssetReferences || [],
          selected_provider: snapshot.selectedProvider || 'google',
          selected_model: snapshot.selectedModel || 'veo-pro',
          credit_cost_estimate: snapshot.creditCostEstimate || 0,
          approved_at: snapshot.approvedAt || new Date().toISOString()
        });
      } catch (err) {
        console.warn('AdDirectorRepository.saveExecutionSnapshot Supabase fallback:', err);
      }
    }
  }

  async getExecutionSnapshot(snapshotId: string, workspaceId?: string): Promise<ExecutionSnapshot | null> {
    const memSnap = this.memorySnapshots.get(snapshotId);
    if (memSnap) {
      if (workspaceId && memSnap.frozenAdSpec?.identity?.workspaceId && memSnap.frozenAdSpec.identity.workspaceId !== workspaceId) {
        return null;
      }
      if (workspaceId && (memSnap as any).workspaceId && (memSnap as any).workspaceId !== workspaceId) {
        return null;
      }
      return JSON.parse(JSON.stringify(memSnap));
    }

    for (const entry of this.memoryAdSpecs.values()) {
      if (workspaceId && entry.root.workspaceId && entry.root.workspaceId !== workspaceId) {
        continue;
      }
      const snap = entry.snapshots.get(snapshotId);
      if (snap) return JSON.parse(JSON.stringify(snap));
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let query = supabase
          .from('ad_director_execution_snapshots')
          .select('*')
          .eq('id', snapshotId);
        if (workspaceId) {
          query = query.eq('workspace_id', workspaceId);
        }
        const { data } = await query.single();
        if (data) {
          return {
            snapshotId: data.id,
            adId: data.plan_id,
            specVersion: data.spec_version,
            specHash: data.spec_hash,
            approvedAt: data.approved_at,
            approvedBy: data.approved_by || 'system',
            selectedProvider: data.selected_provider,
            selectedModel: data.selected_model,
            resolvedAssetReferences: data.resolved_assets,
            frozenAdSpec: data.frozen_ad_spec,
            jobIds: [],
            creditCostEstimate: data.credit_cost_estimate
          };
        }
      } catch (err) {
        // Fallback
      }
    }

    return null;
  }

  async listExecutionSnapshots(projectId: string, workspaceId?: string): Promise<ExecutionSnapshot[]> {
    const list: ExecutionSnapshot[] = [];
    for (const snap of this.memorySnapshots.values()) {
      if (snap.adId === projectId) {
        if (!workspaceId || !snap.frozenAdSpec?.identity?.workspaceId || snap.frozenAdSpec.identity.workspaceId === workspaceId) {
          list.push(JSON.parse(JSON.stringify(snap)));
        }
      }
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let query = supabase
          .from('ad_director_execution_snapshots')
          .select('*')
          .eq('plan_id', projectId);
        if (workspaceId) {
          query = query.eq('workspace_id', workspaceId);
        }
        const { data } = await query.order('approved_at', { ascending: false });
        if (data && data.length > 0) {
          return data.map((d: any) => ({
            snapshotId: d.id,
            adId: d.plan_id,
            specVersion: d.spec_version,
            specHash: d.spec_hash,
            approvedAt: d.approved_at,
            approvedBy: d.approved_by || 'system',
            selectedProvider: d.selected_provider,
            selectedModel: d.selected_model,
            resolvedAssetReferences: d.resolved_assets,
            frozenAdSpec: d.frozen_ad_spec,
            jobIds: [],
            creditCostEstimate: d.credit_cost_estimate
          }));
        }
      } catch (err) {
        // Fallback to memory
      }
    }

    return list;
  }

  // ===========================================================================
  // REVISIONS
  // ===========================================================================

  async saveRevisionRecord(params: {
    planId: string;
    baseVersionNumber: number;
    resultingVersionNumber: number;
    actor: { id: string; role: string };
    reason: string;
    operations: any[];
    impact?: any;
  }): Promise<{ revisionId: string }> {
    const revisionId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: revisionId,
      plan_id: params.planId,
      base_version_number: params.baseVersionNumber,
      resulting_version_number: params.resultingVersionNumber,
      actor: params.actor,
      reason: params.reason,
      operations: params.operations,
      impact: params.impact || {},
      created_at: new Date().toISOString()
    };

    const existing = this.memoryRevisions.get(params.planId) || [];
    existing.unshift(record);
    this.memoryRevisions.set(params.planId, existing);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('ad_director_revisions').insert(record);
      } catch (err) {
        console.warn('AdDirectorRepository.saveRevisionRecord Supabase fallback:', err);
      }
    }

    return { revisionId };
  }

  async getRevisionHistory(planId: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('ad_director_revisions')
          .select('*')
          .eq('plan_id', planId)
          .order('created_at', { ascending: false });
        if (data && data.length > 0) return data;
      } catch {
        // Fallback to memory
      }
    }
    return this.memoryRevisions.get(planId) || [];
  }

  // ===========================================================================
  // PROMPT VERSIONS
  // ===========================================================================

  async savePromptVersion(params: {
    snapshotId: string;
    shotId: string;
    compilerVersion: string;
    targetEngine: string;
    compiledPrompt: string;
    negativePrompt?: string;
    generationParameters?: Record<string, any>;
    resolvedReferences?: any[];
  }): Promise<{ promptVersionId: string }> {
    const promptVersionId = `prompt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: promptVersionId,
      snapshot_id: params.snapshotId,
      shot_id: params.shotId,
      compiler_version: params.compilerVersion || 'v1',
      target_engine: params.targetEngine,
      compiled_prompt: params.compiledPrompt,
      negative_prompt: params.negativePrompt,
      generation_parameters: params.generationParameters || {},
      resolved_references: params.resolvedReferences || [],
      created_at: new Date().toISOString()
    };

    const existing = this.memoryPromptVersions.get(params.snapshotId) || [];
    existing.push(record);
    this.memoryPromptVersions.set(params.snapshotId, existing);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('ad_director_prompt_versions').insert(record);
      } catch (err) {
        console.warn('AdDirectorRepository.savePromptVersion Supabase fallback:', err);
      }
    }

    return { promptVersionId };
  }

  async getPromptVersions(snapshotId: string, shotId?: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let query = supabase
          .from('ad_director_prompt_versions')
          .select('*')
          .eq('snapshot_id', snapshotId);
        if (shotId) {
          query = query.eq('shot_id', shotId);
        }
        const { data } = await query;
        if (data && data.length > 0) return data;
      } catch {
        // Fallback
      }
    }
    const list = this.memoryPromptVersions.get(snapshotId) || [];
    return shotId ? list.filter(p => p.shot_id === shotId) : list;
  }

  // ===========================================================================
  // PROVIDER RUNS
  // ===========================================================================

  async recordProviderRun(params: {
    generationJobId: string;
    provider: string;
    model: string;
    externalJobId?: string;
    attemptNumber?: number;
    status?: string;
    requestMetadata?: Record<string, any>;
  }): Promise<{ runId: string }> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: runId,
      generation_job_id: params.generationJobId,
      provider: params.provider,
      model: params.model,
      external_job_id: params.externalJobId,
      attempt_number: params.attemptNumber || 1,
      status: params.status || 'submitted',
      request_metadata: params.requestMetadata || {},
      response_metadata: {},
      started_at: new Date().toISOString()
    };

    const existing = this.memoryProviderRuns.get(params.generationJobId) || [];
    existing.push(record);
    this.memoryProviderRuns.set(params.generationJobId, existing);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('ad_director_provider_runs').insert(record);
      } catch (err) {
        console.warn('AdDirectorRepository.recordProviderRun Supabase fallback:', err);
      }
    }

    return { runId };
  }

  async updateProviderRun(runId: string, updates: {
    status: string;
    responseMetadata?: Record<string, any>;
    errorMessage?: string;
    completedAt?: string;
  }): Promise<void> {
    for (const runs of this.memoryProviderRuns.values()) {
      const run = runs.find(r => r.id === runId);
      if (run) {
        Object.assign(run, updates, { completed_at: updates.completedAt || new Date().toISOString() });
        break;
      }
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('ad_director_provider_runs')
          .update({
            status: updates.status,
            response_metadata: updates.responseMetadata || {},
            error_message: updates.errorMessage,
            completed_at: updates.completedAt || new Date().toISOString()
          })
          .eq('id', runId);
      } catch (err) {
        console.warn('AdDirectorRepository.updateProviderRun Supabase fallback:', err);
      }
    }
  }

  async getProviderRuns(generationJobId: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('ad_director_provider_runs')
          .select('*')
          .eq('generation_job_id', generationJobId)
          .order('attempt_number', { ascending: true });
        if (data && data.length > 0) return data;
      } catch {
        // Fallback
      }
    }
    return this.memoryProviderRuns.get(generationJobId) || [];
  }

  // ===========================================================================
  // GENERATION RESULTS
  // ===========================================================================

  async saveGenerationResult(params: {
    generationJobId: string;
    snapshotId: string;
    shotId: string;
    outputAssetId?: string;
    provider: string;
    model: string;
    attemptNumber?: number;
    durationSeconds?: number;
    acceptanceStatus?: 'pending' | 'accepted' | 'rejected' | 'superseded';
    metadata?: Record<string, any>;
  }): Promise<{ resultId: string }> {
    const resultId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record = {
      id: resultId,
      generation_job_id: params.generationJobId,
      snapshot_id: params.snapshotId,
      shot_id: params.shotId,
      output_asset_id: params.outputAssetId,
      provider: params.provider,
      model: params.model,
      attempt_number: params.attemptNumber || 1,
      duration_seconds: params.durationSeconds,
      acceptance_status: params.acceptanceStatus || 'pending',
      metadata: params.metadata || {},
      created_at: new Date().toISOString()
    };

    const existing = this.memoryGenerationResults.get(params.snapshotId) || [];
    existing.push(record);
    this.memoryGenerationResults.set(params.snapshotId, existing);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('ad_director_generation_results').insert(record);
      } catch (err) {
        console.warn('AdDirectorRepository.saveGenerationResult Supabase fallback:', err);
      }
    }

    return { resultId };
  }

  async getGenerationResults(snapshotId: string, shotId?: string): Promise<any[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let query = supabase
          .from('ad_director_generation_results')
          .select('*')
          .eq('snapshot_id', snapshotId);
        if (shotId) {
          query = query.eq('shot_id', shotId);
        }
        const { data } = await query;
        if (data && data.length > 0) return data;
      } catch {
        // Fallback
      }
    }
    const list = this.memoryGenerationResults.get(snapshotId) || [];
    return shotId ? list.filter(r => r.shot_id === shotId) : list;
  }

  // ===========================================================================
  // QA RESULTS & REPAIR PLANS
  // ===========================================================================

  async saveQAResult(params: any): Promise<{ qaId: string }> {
    const qaId = params.id || `qa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const snapshotId = params.snapshotId || params.executionSnapshotId || params.snapshot_id;
    const shotId = params.shotId || params.shot_id;

    const record: VideoQAResult = {
      id: qaId,
      executionId: params.executionId || params.execution_id || snapshotId,
      executionSnapshotId: snapshotId,
      shotId: shotId,
      generationJobId: params.generationJobId || params.generation_job_id || `job_${qaId}`,
      attemptNumber: params.attemptNumber ?? params.attempt_number ?? 1,
      status: params.status || 'passed',
      overallResult: params.overallResult || params.overall_result || (params.status === 'passed' ? 'passed' : 'failed'),
      technicalChecks: params.technicalChecks || params.technical_checks || [],
      creativeChecks: params.creativeChecks || params.creative_checks || [],
      continuityChecks: params.continuityChecks || params.continuity_checks || [],
      brandChecks: params.brandChecks || params.brand_checks || [],
      constraintChecks: params.constraintChecks || params.constraint_checks || [],
      failures: params.failures || params.issues || [],
      warnings: params.warnings || [],
      repairRequired: Boolean(params.repairRequired ?? params.repair_required),
      repairPlanId: params.repairPlanId || params.repair_plan_id,
      evaluatorVersion: params.evaluatorVersion || params.evaluator_version || 'v1',
      evaluatedAt: params.evaluatedAt || params.evaluated_at || new Date().toISOString(),
      createdAt: params.createdAt || params.created_at || new Date().toISOString()
    };

    const existing = this.memoryQAResults.get(snapshotId) || [];
    existing.push(record);
    this.memoryQAResults.set(snapshotId, existing);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const dbRow = {
          id: record.id,
          result_id: params.resultId || params.result_id || record.id,
          generation_job_id: record.generationJobId,
          snapshot_id: record.executionSnapshotId,
          shot_id: record.shotId,
          status: record.status,
          attempt_number: record.attemptNumber,
          overall_result: record.overallResult,
          technical_checks: record.technicalChecks,
          creative_checks: record.creativeChecks,
          continuity_checks: record.continuityChecks,
          brand_checks: record.brandChecks,
          constraint_checks: record.constraintChecks,
          failures: record.failures,
          warnings: record.warnings,
          repair_required: record.repairRequired,
          repair_plan_id: record.repairPlanId,
          evaluator_version: record.evaluatorVersion,
          evaluated_at: record.evaluatedAt
        };
        await supabase.from('ad_director_qa_results').insert(dbRow);
      } catch (err) {
        console.warn('AdDirectorRepository.saveQAResult Supabase fallback:', err);
      }
    }

    return { qaId };
  }

  async getQAResults(snapshotId: string, shotId?: string): Promise<VideoQAResult[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let query = supabase
          .from('ad_director_qa_results')
          .select('*')
          .eq('snapshot_id', snapshotId);
        if (shotId) {
          query = query.eq('shot_id', shotId);
        }
        const { data } = await query.order('evaluated_at', { ascending: false });
        if (data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            executionId: d.snapshot_id,
            executionSnapshotId: d.snapshot_id,
            shotId: d.shot_id,
            generationJobId: d.generation_job_id,
            attemptNumber: d.attempt_number || 1,
            status: d.status,
            overallResult: d.overall_result || (d.status === 'passed' ? 'passed' : 'failed'),
            technicalChecks: d.technical_checks || [],
            creativeChecks: d.creative_checks || [],
            continuityChecks: d.continuity_checks || [],
            brandChecks: d.brand_checks || [],
            constraintChecks: d.constraint_checks || [],
            failures: d.failures || d.issues || [],
            warnings: d.warnings || [],
            repairRequired: Boolean(d.repair_required),
            repairPlanId: d.repair_plan_id,
            evaluatorVersion: d.evaluator_version || 'v1',
            evaluatedAt: d.evaluated_at,
            createdAt: d.created_at || d.evaluated_at
          }));
        }
      } catch {
        // Fallback to memory
      }
    }
    const list = (this.memoryQAResults.get(snapshotId) || []) as VideoQAResult[];
    const filtered = shotId ? list.filter(q => q.shotId === shotId) : list;
    return filtered.slice().sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime());
  }

  async getLatestQAResult(snapshotId: string, shotId: string): Promise<VideoQAResult | null> {
    const results = await this.getQAResults(snapshotId, shotId);
    return results.length > 0 ? results[0] : null;
  }

  async saveRepairPlan(plan: RepairPlan): Promise<{ repairPlanId: string }> {
    const existing = this.memoryRepairPlans.get(plan.snapshotId) || [];
    existing.push(plan);
    this.memoryRepairPlans.set(plan.snapshotId, existing);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('ad_director_repair_plans').insert({
          id: plan.id,
          snapshot_id: plan.snapshotId,
          shot_id: plan.shotId,
          qa_result_id: plan.qaResultId,
          diagnosis: plan.diagnosis,
          operations: plan.operations,
          preserved_state: plan.preservedState,
          approval_level: plan.approvalLevel,
          status: plan.status,
          impact: plan.impact || {},
          reason: plan.reason,
          created_at: plan.createdAt
        });
      } catch (err) {
        console.warn('AdDirectorRepository.saveRepairPlan Supabase fallback:', err);
      }
    }

    return { repairPlanId: plan.id };
  }

  async getRepairPlan(repairPlanId: string): Promise<RepairPlan | null> {
    for (const plans of this.memoryRepairPlans.values()) {
      const found = plans.find(p => p.id === repairPlanId);
      if (found) return found;
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('ad_director_repair_plans')
          .select('*')
          .eq('id', repairPlanId)
          .single();

        if (data) {
          return {
            id: data.id,
            snapshotId: data.snapshot_id,
            shotId: data.shot_id,
            qaResultId: data.qa_result_id,
            diagnosis: data.diagnosis,
            operations: data.operations || [],
            preservedState: data.preserved_state || [],
            approvalLevel: data.approval_level,
            status: data.status,
            impact: data.impact,
            reason: data.reason,
            createdAt: data.created_at,
            appliedAt: data.applied_at
          };
        }
      } catch {
        // Fallback
      }
    }
    return null;
  }

  async getRepairPlanForQA(qaResultId: string): Promise<RepairPlan | null> {
    for (const plans of this.memoryRepairPlans.values()) {
      const found = plans.find(p => p.qaResultId === qaResultId);
      if (found) return found;
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('ad_director_repair_plans')
          .select('*')
          .eq('qa_result_id', qaResultId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          return {
            id: data.id,
            snapshotId: data.snapshot_id,
            shotId: data.shot_id,
            qaResultId: data.qa_result_id,
            diagnosis: data.diagnosis,
            operations: data.operations || [],
            preservedState: data.preserved_state || [],
            approvalLevel: data.approval_level,
            status: data.status,
            impact: data.impact,
            reason: data.reason,
            createdAt: data.created_at,
            appliedAt: data.applied_at
          };
        }
      } catch {
        // Fallback
      }
    }
    return null;
  }

  async updateRepairPlanStatus(repairPlanId: string, status: RepairPlanStatus): Promise<boolean> {
    for (const plans of this.memoryRepairPlans.values()) {
      const found = plans.find(p => p.id === repairPlanId);
      if (found) {
        found.status = status;
        if (status === 'applied') found.appliedAt = new Date().toISOString();
      }
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const updateData: any = { status };
        if (status === 'applied') updateData.applied_at = new Date().toISOString();
        await supabase
          .from('ad_director_repair_plans')
          .update(updateData)
          .eq('id', repairPlanId);
        return true;
      } catch {
        // Fallback
      }
    }
    return true;
  }

  // ===========================================================================
  // Phase 10: Assembly Specifications, Render Jobs & Export Variants
  // ===========================================================================

  async saveAssembly(assembly: AssemblyRecord): Promise<void> {
    this.memoryAssemblies.set(assembly.id, assembly);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('ad_director_assemblies')
          .upsert({
            id: assembly.id,
            project_id: assembly.projectId,
            execution_id: assembly.executionId,
            workspace_id: assembly.workspaceId,
            version: assembly.version,
            assembly_hash: assembly.assemblyHash,
            status: assembly.status,
            assembly_spec: assembly.assemblySpec,
            validation_report: assembly.validationReport,
            created_by: assembly.createdBy,
            created_at: assembly.createdAt,
            updated_at: assembly.updatedAt
          });
      } catch (err) {
        console.warn('[AdDirectorRepository] Failed saving assembly to Supabase (using memory fallback):', err);
      }
    }
  }

  async getAssembly(assemblyId: string, workspaceId?: string): Promise<AssemblyRecord | null> {
    const memory = this.memoryAssemblies.get(assemblyId);
    if (memory) {
      if (workspaceId && memory.workspaceId !== workspaceId) return null;
      return memory;
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let query = supabase
          .from('ad_director_assemblies')
          .select('*')
          .eq('id', assemblyId);

        if (workspaceId) {
          query = query.eq('workspace_id', workspaceId);
        }

        const { data } = await query.maybeSingle();
        if (data) {
          return {
            id: data.id,
            projectId: data.project_id,
            executionId: data.execution_id,
            workspaceId: data.workspace_id,
            version: data.version,
            assemblyHash: data.assembly_hash,
            status: data.status,
            assemblySpec: data.assembly_spec,
            validationReport: data.validation_report,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
        }
      } catch {
        // Fallback
      }
    }
    return null;
  }

  async getLatestAssembly(executionId: string, workspaceId?: string): Promise<AssemblyRecord | null> {
    // Check in-memory first
    const matching: AssemblyRecord[] = [];
    for (const a of this.memoryAssemblies.values()) {
      if (a.executionId === executionId) {
        if (!workspaceId || a.workspaceId === workspaceId) {
          matching.push(a);
        }
      }
    }
    if (matching.length > 0) {
      matching.sort((a, b) => b.version - a.version);
      return matching[0];
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let query = supabase
          .from('ad_director_assemblies')
          .select('*')
          .eq('execution_id', executionId)
          .order('version', { ascending: false })
          .limit(1);

        if (workspaceId) {
          query = query.eq('workspace_id', workspaceId);
        }

        const { data } = await query.maybeSingle();
        if (data) {
          return {
            id: data.id,
            projectId: data.project_id,
            executionId: data.execution_id,
            workspaceId: data.workspace_id,
            version: data.version,
            assemblyHash: data.assembly_hash,
            status: data.status,
            assemblySpec: data.assembly_spec,
            validationReport: data.validation_report,
            createdBy: data.created_by,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
        }
      } catch {
        // Fallback
      }
    }
    return null;
  }

  async saveRenderJob(render: RenderJobRecord): Promise<void> {
    this.memoryRenders.set(render.id, render);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('ad_director_renders')
          .upsert({
            id: render.id,
            assembly_id: render.assemblyId,
            job_id: render.jobId,
            workspace_id: render.workspaceId,
            render_type: render.renderType,
            status: render.status,
            output_asset_id: render.outputAssetId,
            duration_seconds: render.durationSeconds,
            width: render.width,
            height: render.height,
            aspect_ratio: render.aspectRatio,
            file_size_bytes: render.fileSizeBytes,
            render_progress: render.renderProgress,
            progress_step: render.progressStep,
            error_message: render.errorMessage,
            storage_path: render.storagePath,
            metadata: render.metadata || {},
            started_at: render.startedAt,
            completed_at: render.completedAt,
            created_at: render.createdAt
          });
      } catch (err) {
        console.warn('[AdDirectorRepository] Failed saving render job to Supabase (using memory fallback):', err);
      }
    }
  }

  async getRenderJob(renderId: string): Promise<RenderJobRecord | null> {
    const memory = this.memoryRenders.get(renderId);
    if (memory) return memory;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('ad_director_renders')
          .select('*')
          .eq('id', renderId)
          .maybeSingle();

        if (data) {
          return {
            id: data.id,
            assemblyId: data.assembly_id,
            jobId: data.job_id,
            workspaceId: data.workspace_id,
            renderType: data.render_type,
            status: data.status,
            outputAssetId: data.output_asset_id,
            durationSeconds: data.duration_seconds ? parseFloat(data.duration_seconds) : undefined,
            width: data.width,
            height: data.height,
            aspectRatio: data.aspect_ratio,
            fileSizeBytes: data.file_size_bytes ? parseInt(data.file_size_bytes, 10) : undefined,
            renderProgress: data.render_progress || 0,
            progressStep: data.progress_step,
            errorMessage: data.error_message,
            storagePath: data.storage_path,
            metadata: data.metadata || {},
            startedAt: data.started_at,
            completedAt: data.completed_at,
            createdAt: data.created_at
          };
        }
      } catch {
        // Fallback
      }
    }
    return null;
  }

  async getRenderJobByAssembly(assemblyId: string): Promise<RenderJobRecord | null> {
    for (const r of this.memoryRenders.values()) {
      if (r.assemblyId === assemblyId && r.renderType === 'master') {
        return r;
      }
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('ad_director_renders')
          .select('*')
          .eq('assembly_id', assemblyId)
          .eq('render_type', 'master')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          return {
            id: data.id,
            assemblyId: data.assembly_id,
            jobId: data.job_id,
            workspaceId: data.workspace_id,
            renderType: data.render_type,
            status: data.status,
            outputAssetId: data.output_asset_id,
            durationSeconds: data.duration_seconds ? parseFloat(data.duration_seconds) : undefined,
            width: data.width,
            height: data.height,
            aspectRatio: data.aspect_ratio,
            fileSizeBytes: data.file_size_bytes ? parseInt(data.file_size_bytes, 10) : undefined,
            renderProgress: data.render_progress || 0,
            progressStep: data.progress_step,
            errorMessage: data.error_message,
            storagePath: data.storage_path,
            metadata: data.metadata || {},
            startedAt: data.started_at,
            completedAt: data.completed_at,
            createdAt: data.created_at
          };
        }
      } catch {
        // Fallback
      }
    }
    return null;
  }

  async updateRenderJob(renderId: string, updates: Partial<RenderJobRecord>): Promise<void> {
    const memory = this.memoryRenders.get(renderId);
    if (memory) {
      Object.assign(memory, updates);
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const dbUpdates: any = {};
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.renderProgress !== undefined) dbUpdates.render_progress = updates.renderProgress;
        if (updates.progressStep !== undefined) dbUpdates.progress_step = updates.progressStep;
        if (updates.errorMessage !== undefined) dbUpdates.error_message = updates.errorMessage;
        if (updates.outputAssetId !== undefined) dbUpdates.output_asset_id = updates.outputAssetId;
        if (updates.storagePath !== undefined) dbUpdates.storage_path = updates.storagePath;
        if (updates.durationSeconds !== undefined) dbUpdates.duration_seconds = updates.durationSeconds;
        if (updates.width !== undefined) dbUpdates.width = updates.width;
        if (updates.height !== undefined) dbUpdates.height = updates.height;
        if (updates.aspectRatio !== undefined) dbUpdates.aspect_ratio = updates.aspectRatio;
        if (updates.fileSizeBytes !== undefined) dbUpdates.file_size_bytes = updates.fileSizeBytes;
        if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
        if (updates.startedAt !== undefined) dbUpdates.started_at = updates.startedAt;
        if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;

        await supabase
          .from('ad_director_renders')
          .update(dbUpdates)
          .eq('id', renderId);
      } catch {
        // Fallback
      }
    }
  }

  async saveExportVariant(variant: ExportVariantRecord): Promise<void> {
    const list = this.memoryExports.get(variant.renderId) || [];
    const existingIdx = list.findIndex(v => v.id === variant.id);
    if (existingIdx >= 0) {
      list[existingIdx] = variant;
    } else {
      list.push(variant);
    }
    this.memoryExports.set(variant.renderId, list);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('ad_director_exports')
          .upsert({
            id: variant.id,
            render_id: variant.renderId,
            workspace_id: variant.workspaceId,
            preset_name: variant.presetName,
            status: variant.status,
            output_asset_id: variant.outputAssetId,
            storage_path: variant.storagePath,
            width: variant.width,
            height: variant.height,
            aspect_ratio: variant.aspectRatio,
            file_size_bytes: variant.fileSizeBytes,
            created_at: variant.createdAt,
            completed_at: variant.completedAt
          });
      } catch (err) {
        console.warn('[AdDirectorRepository] Failed saving export variant to Supabase (using memory fallback):', err);
      }
    }
  }

  async getExportVariants(renderId: string): Promise<ExportVariantRecord[]> {
    const memList = this.memoryExports.get(renderId) || [];
    if (memList.length > 0) return memList;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('ad_director_exports')
          .select('*')
          .eq('render_id', renderId)
          .order('created_at', { ascending: true });

        if (data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            renderId: d.render_id,
            workspaceId: d.workspace_id,
            presetName: d.preset_name,
            status: d.status,
            outputAssetId: d.output_asset_id,
            storagePath: d.storage_path,
            width: d.width,
            height: d.height,
            aspectRatio: d.aspect_ratio,
            fileSizeBytes: d.file_size_bytes ? parseInt(d.file_size_bytes, 10) : undefined,
            createdAt: d.created_at,
            completedAt: d.completed_at
          }));
        }
      } catch {
        // Fallback
      }
    }
    return [];
  }
}

export const adDirectorRepository = new AdDirectorRepository();

