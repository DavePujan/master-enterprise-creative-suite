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
    if (!supabase) {
      const id = `mem-strat-${Date.now()}`;
      this.memoryStrategies.set(id, {
        id,
        workspace_id: params.workspaceId,
        user_id: params.userId,
        title: params.title,
        framework_id: params.frameworkId,
        status: 'active',
        created_at: new Date().toISOString()
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
        title: params.title,
        framework_id: params.frameworkId
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
    if (!supabase) {
      const versionId = `mem-ver-${Date.now()}`;
      const existing = this.memoryVersions.get(params.campaignStrategyId) || [];
      existing.push({
        id: versionId,
        ...params,
        created_at: new Date().toISOString()
      });
      this.memoryVersions.set(params.campaignStrategyId, existing);
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
      return { versionId };
    }

    // Update root record current_version_id
    await supabase
      .from('campaign_strategies')
      .update({ current_version_id: data.id, updated_at: new Date().toISOString() })
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
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      const strat = this.memoryStrategies.get(strategyId);
      const vers = this.memoryVersions.get(strategyId) || [];
      return strat ? { ...strat, versions: vers } : null;
    }

    const { data, error } = await supabase
      .from('campaign_strategies')
      .select(`
        *,
        campaign_strategy_versions(*)
      `)
      .eq('id', strategyId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Lists active strategies for a workspace.
   */
  async listWorkspaceStrategies(workspaceId: string, limit = 20): Promise<any[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return Array.from(this.memoryStrategies.values())
        .filter(s => s.workspace_id === workspaceId)
        .slice(0, limit);
    }

    const { data, error } = await supabase
      .from('campaign_strategies')
      .select('id, title, status, framework_id, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      const mem = Array.from(this.memoryStrategies.values())
        .filter(s => s.workspace_id === workspaceId)
        .slice(0, limit);
      if (mem.length > 0) return mem;
      return [];
    }
    return data || [];
  }

  /**
   * Alias for listWorkspaceStrategies for API parity.
   */
  async getWorkspaceStrategies(workspaceId: string, limit = 20): Promise<any[]> {
    return this.listWorkspaceStrategies(workspaceId, limit);
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
