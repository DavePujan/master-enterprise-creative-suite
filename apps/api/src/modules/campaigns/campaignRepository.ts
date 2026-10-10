/**
 * Campaign Repository for Campaign Strategist 2.0.
 * Persists versioned strategies, territory pivots, and multi-vector fingerprints
 * to public.campaign_strategies, public.campaign_strategy_versions, and public.campaign_strategy_fingerprints.
 * Provides in-memory resilience if running in local standalone test mode.
 */

import { getSupabaseAdmin } from '../../infrastructure/supabase/supabaseClient.js';
import {
  MasterCampaignStrategy,
  StrategicTerritory,
  DownstreamBriefs,
  EpistemicClaim,
  CampaignFingerprint
} from '../../../../../packages/types/campaignStrategy.js';
import { StoredStrategyMemory } from './campaignNoveltyEngine.js';

export interface SaveStrategyParams {
  workspaceId: string;
  userId: string;
  title: string;
  frameworkId: string;
}

export interface SaveVersionParams {
  campaignStrategyId: string;
  versionNumber: number;
  parentVersionId?: string;
  changeReason?: string;
  selectedTerritory: StrategicTerritory;
  masterStrategy: MasterCampaignStrategy;
  downstreamBriefs: DownstreamBriefs;
  epistemicLedger: EpistemicClaim[];
  criticReport: any;
  createdBy?: string;
}

export interface SaveFingerprintParams {
  workspaceId: string;
  campaignStrategyId: string;
  versionId: string;
  fingerprint: CampaignFingerprint;
}

export class CampaignRepository {
  // In-memory fallback stores for tests / disconnected mode
  private memoryStrategies = new Map<string, any>();
  private memoryVersions = new Map<string, any[]>();
  private memoryFingerprints = new Map<string, StoredStrategyMemory[]>();
  private memoryRequests = new Map<string, { data: any; expiresAt: number }>();

  /**
   * Creates a root campaign strategy record.
   */
  async createStrategy(params: SaveStrategyParams): Promise<{ id: string }> {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    if (!supabase) {
      const id = `mem-strat-${Date.now()}`;
      this.memoryStrategies.set(id, {
        id,
        workspace_id: params.workspaceId,
        user_id: params.userId,
        title: params.title,
        framework_id: params.frameworkId,
        status: 'active',
        created_at: now,
        updated_at: now
      });
      return { id };
    }

    const { data, error } = await supabase
      .from('campaign_strategies')
      .insert({
        workspace_id: params.workspaceId,
        created_by: params.userId,
        title: params.title,
        framework_id: params.frameworkId,
        status: 'active'
      })
      .select('id')
      .single();

    if (error) {
      console.warn('CampaignRepository.createStrategy DB insert failed, falling back to memory store:', error.message);
      const id = `mem-strat-${Date.now()}`;
      this.memoryStrategies.set(id, {
        id,
        workspace_id: params.workspaceId,
        user_id: params.userId,
        title: params.title,
        framework_id: params.frameworkId,
        status: 'active',
        created_at: now,
        updated_at: now
      });
      return { id };
    }

    return { id: data.id };
  }

  /**
   * Adds an immutable version snapshot to an existing campaign strategy.
   */
  async saveVersion(params: SaveVersionParams): Promise<{ versionId: string }> {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    if (!supabase) {
      const versionId = `mem-ver-${Date.now()}`;
      const existing = this.memoryVersions.get(params.campaignStrategyId) || [];
      existing.push({
        id: versionId,
        ...params,
        selected_territory: params.selectedTerritory,
        created_at: now
      });
      this.memoryVersions.set(params.campaignStrategyId, existing);
      const root = this.memoryStrategies.get(params.campaignStrategyId);
      if (root) {
        root.updated_at = now;
        root.current_version_id = versionId;
      }
      return { versionId };
    }

    const { data, error } = await supabase
      .from('campaign_strategy_versions')
      .insert({
        campaign_strategy_id: params.campaignStrategyId,
        version_number: params.versionNumber,
        selected_territory: params.selectedTerritory,
        master_strategy: params.masterStrategy,
        downstream_briefs: params.downstreamBriefs,
        epistemic_ledger: params.epistemicLedger,
        critic_report: params.criticReport,
        created_by: params.createdBy
      })
      .select('id')
      .single();

    if (error) {
      console.warn('CampaignRepository.saveVersion DB insert failed, falling back to memory store:', error.message);
      const versionId = `mem-ver-${Date.now()}`;
      const existing = this.memoryVersions.get(params.campaignStrategyId) || [];
      existing.push({
        id: versionId,
        ...params,
        selected_territory: params.selectedTerritory,
        created_at: now
      });
      this.memoryVersions.set(params.campaignStrategyId, existing);
      const root = this.memoryStrategies.get(params.campaignStrategyId);
      if (root) {
        root.updated_at = now;
        root.current_version_id = versionId;
      }
      return { versionId };
    }

    // Update root record current_version_id
    await supabase
      .from('campaign_strategies')
      .update({ current_version_id: data.id, updated_at: now })
      .eq('id', params.campaignStrategyId);

    return { versionId: data.id };
  }

  /**
   * Stores a strategy fingerprint for multi-vector novelty tracking.
   */
  async saveFingerprint(params: SaveFingerprintParams): Promise<void> {
    const supabase = getSupabaseAdmin();
    const memEntry: StoredStrategyMemory = {
      campaignStrategyId: params.campaignStrategyId,
      title: params.fingerprint.narrativeHash,
      narrativeHash: params.fingerprint.narrativeHash,
      mechanismHash: params.fingerprint.mechanismHash,
      emotionalHash: params.fingerprint.emotionalHash,
      insightHash: params.fingerprint.insightHash,
      visualHash: params.fingerprint.visualHash,
      tokenBag: params.fingerprint.tokenBag
    };

    // Always update in-memory cache for ultra-low latency reads
    const existing = this.memoryFingerprints.get(params.workspaceId) || [];
    existing.unshift(memEntry);
    this.memoryFingerprints.set(params.workspaceId, existing.slice(0, 50));

    if (!supabase) return;

    try {
      await supabase.from('campaign_strategy_fingerprints').insert({
        workspace_id: params.workspaceId,
        campaign_strategy_id: params.campaignStrategyId,
        version_id: params.versionId,
        narrative_hash: params.fingerprint.narrativeHash,
        mechanism_hash: params.fingerprint.mechanismHash,
        emotional_hash: params.fingerprint.emotionalHash,
        insight_hash: params.fingerprint.insightHash,
        visual_hash: params.fingerprint.visualHash,
        token_bag: params.fingerprint.tokenBag
      });
    } catch (err: any) {
      console.warn('CampaignRepository.saveFingerprint DB insert warning:', err?.message || err);
    }
  }

  /**
   * Retrieves recent strategy fingerprints for workspace memory novelty checks.
   */
  async getRecentWorkspaceFingerprints(workspaceId: string, limit = 10): Promise<StoredStrategyMemory[]> {
    const cached = this.memoryFingerprints.get(workspaceId) || [];
    const supabase = getSupabaseAdmin();
    if (!supabase) return cached.slice(0, limit);

    try {
      const { data, error } = await supabase
        .from('campaign_strategy_fingerprints')
        .select(`
          campaign_strategy_id,
          narrative_hash,
          mechanism_hash,
          emotional_hash,
          insight_hash,
          visual_hash,
          token_bag,
          campaign_strategies(title)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data || data.length === 0) {
        return cached.slice(0, limit);
      }

      return data.map((row: any) => ({
        campaignStrategyId: row.campaign_strategy_id,
        title: row.campaign_strategies?.title || 'Prior Campaign',
        narrativeHash: row.narrative_hash,
        mechanismHash: row.mechanism_hash,
        emotionalHash: row.emotional_hash,
        insightHash: row.insight_hash,
        visualHash: row.visual_hash,
        tokenBag: row.token_bag || []
      }));
    } catch (err) {
      return cached.slice(0, limit);
    }
  }

  /**
   * Loads a strategy by ID with its current version.
   */
  async getStrategyById(strategyId: string, workspaceId: string): Promise<any | null> {
    const normalizeStrategy = (row: any) => {
      if (!row) return null;
      const vers = (row.campaign_strategy_versions || row.versions || []).map((v: any) => ({
        ...v,
        selected_territory: v.selected_territory || v.selectedTerritory,
        selectedTerritory: v.selected_territory || v.selectedTerritory,
        master_strategy: v.master_strategy || v.masterStrategy,
        masterStrategy: v.master_strategy || v.masterStrategy,
        downstream_briefs: v.downstream_briefs || v.downstreamBriefs,
        downstreamBriefs: v.downstream_briefs || v.downstreamBriefs
      }));
      return {
        ...row,
        campaign_strategy_versions: vers,
        versions: vers
      };
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('campaign_strategies')
          .select(`
            *,
            campaign_strategy_versions!campaign_strategy_versions_campaign_strategy_id_fkey(*)
          `)
          .eq('id', strategyId)
          .single();

        if (data && !error) {
          return normalizeStrategy(data);
        }
      } catch (err) {
        // Fall back to memory
      }
    }

    const strat = this.memoryStrategies.get(strategyId);
    if (strat) {
      const vers = this.memoryVersions.get(strategyId) || [];
      return normalizeStrategy({ ...strat, versions: vers });
    }

    return null;
  }

  /**
   * Lists active strategies for a workspace, enriched with version numbers, stage progress (out of 5), and territory details.
   */
  async listWorkspaceStrategies(workspaceId: string, limit = 50): Promise<any[]> {
    const mapRow = (s: any) => {
      const vers = s.campaign_strategy_versions || s.versions || [];
      const latestVer = vers.length > 0
        ? [...vers].sort((a: any, b: any) => (b.version_number || 0) - (a.version_number || 0))[0]
        : null;
      const territory = latestVer?.selected_territory || latestVer?.selectedTerritory;
      const territoryName = territory?.name || territory?.title || territory?.angle || null;
      const territoryPremise = territory?.premise || territory?.description || null;

      // Calculate journey stage status out of 5
      const hasDownstream = Boolean(
        latestVer?.downstream_briefs?.canonicalAdSpec ||
        latestVer?.downstreamBriefs?.canonicalAdSpec ||
        latestVer?.downstream_briefs?.channelBriefs?.length ||
        latestVer?.downstreamBriefs?.channelBriefs?.length
      );
      const hasMaster = Boolean(latestVer?.master_strategy || latestVer?.masterStrategy);
      const stageNumber = hasDownstream ? 5 : hasMaster ? 4 : territory ? 3 : 1;
      const stageLabel = stageNumber === 5 ? 'Stage 5/5 · Activation Ready' :
                         stageNumber === 4 ? 'Stage 4/5 · Master Strategy' :
                         stageNumber === 3 ? 'Stage 3/5 · Strategic Routes' :
                         'Stage 1/5 · Brief & Scope';

      // Defensive date resolution: Guarantee valid ISO timestamp (never undefined/null)
      let resolvedDate = s.updated_at || s.created_at;
      if (!resolvedDate || isNaN(new Date(resolvedDate).getTime())) {
        const match = String(s.id).match(/\d{12,14}/);
        if (match) {
          resolvedDate = new Date(Number(match[0])).toISOString();
        } else {
          resolvedDate = new Date().toISOString();
        }
      }

      return {
        id: s.id,
        workspace_id: s.workspace_id,
        title: s.title || 'Untitled Strategy',
        status: s.status || 'active',
        stage_number: stageNumber,
        stage_total: 5,
        stage_label: stageLabel,
        framework_id: s.framework_id || null,
        created_at: s.created_at || resolvedDate,
        updated_at: resolvedDate,
        current_version_id: s.current_version_id || latestVer?.id || null,
        version_number: latestVer?.version_number || 1,
        version_count: Math.max(1, vers.length),
        territory_name: territoryName,
        territory_premise: territoryPremise,
        versions: vers
      };
    };

    const getMemoryStrategies = () => {
      return Array.from(this.memoryStrategies.values())
        .filter(s => s.workspace_id === workspaceId)
        .map(s => {
          const versions = this.memoryVersions.get(s.id) || [];
          return mapRow({ ...s, versions });
        })
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, limit);
    };

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return getMemoryStrategies();
    }

    try {
      const { data, error } = await supabase
        .from('campaign_strategies')
        .select(`
          id,
          workspace_id,
          title,
          status,
          framework_id,
          created_at,
          updated_at,
          current_version_id,
          campaign_strategy_versions!campaign_strategy_versions_campaign_strategy_id_fkey (
            id,
            version_number,
            selected_territory,
            master_strategy,
            downstream_briefs,
            created_at
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error || !data || data.length === 0) {
        const mem = getMemoryStrategies();
        if (mem.length > 0) return mem;
        return [];
      }

      return data.map(mapRow);
    } catch {
      return getMemoryStrategies();
    }
  }

  /**
   * Alias for listWorkspaceStrategies for API parity.
   */
  async getWorkspaceStrategies(workspaceId: string, limit = 50): Promise<any[]> {
    return this.listWorkspaceStrategies(workspaceId, limit);
  }

  /**
   * Updates strategy metadata such as title or status.
   */
  async updateStrategy(
    strategyId: string,
    workspaceId: string,
    updates: { title?: string; status?: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const memStrat = this.memoryStrategies.get(strategyId);
    if (memStrat && memStrat.workspace_id === workspaceId) {
      if (updates.title !== undefined) memStrat.title = updates.title;
      if (updates.status !== undefined) memStrat.status = updates.status;
      memStrat.updated_at = now;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return !!memStrat;

    try {
      const { error } = await supabase
        .from('campaign_strategies')
        .update({
          ...(updates.title !== undefined ? { title: updates.title } : {}),
          ...(updates.status !== undefined ? { status: updates.status } : {}),
          updated_at: now
        })
        .eq('id', strategyId)
        .eq('workspace_id', workspaceId);

      if (error) {
        return !!memStrat;
      }
      return true;
    } catch {
      return !!memStrat;
    }
  }

  /**
   * Clones a strategy and its latest version.
   */
  async duplicateStrategy(strategyId: string, workspaceId: string, userId: string): Promise<any | null> {
    const original = await this.getStrategyById(strategyId, workspaceId);
    if (!original) return null;

    const newTitle = `${original.title || 'Untitled Strategy'} (Copy)`;
    const newStrategy = await this.createStrategy({
      workspaceId,
      userId,
      title: newTitle,
      frameworkId: original.framework_id || 'GENERAL'
    });

    const versions = original.campaign_strategy_versions || original.versions || [];
    if (versions.length > 0) {
      const latest = versions[versions.length - 1];
      await this.saveVersion({
        campaignStrategyId: newStrategy.id,
        versionNumber: 1,
        selectedTerritory: latest.selected_territory || latest.selectedTerritory,
        masterStrategy: latest.master_strategy || latest.masterStrategy,
        downstreamBriefs: latest.downstream_briefs || latest.downstreamBriefs,
        epistemicLedger: latest.epistemic_ledger || latest.epistemicLedger || [],
        criticReport: latest.critic_report || latest.criticReport || {},
        createdBy: userId
      });
    }

    return await this.getStrategyById(newStrategy.id, workspaceId);
  }

  /**
   * Deletes a strategy and cascades to its versions and memory entries.
   */
  async deleteStrategy(strategyId: string, workspaceId: string): Promise<boolean> {
    const hadMem = this.memoryStrategies.has(strategyId);
    this.memoryStrategies.delete(strategyId);
    this.memoryVersions.delete(strategyId);

    const supabase = getSupabaseAdmin();
    if (!supabase) return hadMem;

    try {
      await supabase
        .from('campaign_strategy_versions')
        .delete()
        .eq('campaign_strategy_id', strategyId);

      const { error } = await supabase
        .from('campaign_strategies')
        .delete()
        .eq('id', strategyId)
        .eq('workspace_id', workspaceId);

      if (error) {
        return hadMem;
      }
      return true;
    } catch (err) {
      console.warn('CampaignRepository.deleteStrategy error:', err);
      return hadMem;
    }
  }

  /**
   * Saves an idempotent generation request result (in-memory + Supabase fallback).
   */
  async saveGenerationRequest(requestHash: string, data: any, ttlSec = 3600): Promise<void> {
    const expiresAt = Date.now() + ttlSec * 1000;
    this.memoryRequests.set(requestHash, { data, expiresAt });

    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      await supabase.from('campaign_generation_requests').upsert({
        request_hash: requestHash,
        result: data,
        expires_at: new Date(expiresAt).toISOString()
      }, { onConflict: 'request_hash' });
    } catch {
      // Memory fallback is always active
    }
  }

  /**
   * Retrieves an idempotent generation request result if unexpired.
   */
  async getGenerationRequest(requestHash: string): Promise<any | null> {
    const mem = this.memoryRequests.get(requestHash);
    if (mem && mem.expiresAt > Date.now()) {
      return mem.data;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('campaign_generation_requests')
        .select('result, expires_at')
        .eq('request_hash', requestHash)
        .single();

      if (error || !data) return null;
      if (new Date(data.expires_at).getTime() < Date.now()) return null;
      return data.result;
    } catch {
      return null;
    }
  }
}

export const campaignRepository = new CampaignRepository();
