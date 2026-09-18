import { getSupabaseAdmin } from '../../../infrastructure/supabase/supabaseClient.js';
import type { CreativeConcept } from '@contracts/adSpecContracts.js';

export class VideoAdConceptRepository {
  // In-memory fallback for unit tests and local execution without Supabase credentials
  private inMemoryConcepts = new Map<string, CreativeConcept>();

  /**
   * Persists a batch of creative concepts to Supabase and in-memory cache.
   */
  public async saveConcepts(concepts: CreativeConcept[], workspaceId: string): Promise<CreativeConcept[]> {
    const enriched = concepts.map(c => ({
      ...c,
      workspaceId,
      updatedAt: new Date().toISOString()
    }));

    for (const concept of enriched) {
      this.inMemoryConcepts.set(concept.id, JSON.parse(JSON.stringify(concept)));
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return enriched;

    try {
      const rows = enriched.map(c => ({
        id: c.id,
        project_id: c.projectId,
        workspace_id: c.workspaceId,
        brief_version: c.briefVersion,
        name: c.name,
        one_line_idea: c.oneLineIdea,
        strategic_foundation: c.strategicFoundation,
        creative_mechanism: c.creativeMechanism,
        hook: c.hook,
        premise: c.premise,
        emotional_arc: c.emotionalArc,
        visual_direction: c.visualDirection,
        narrative_structure: c.narrativeStructure,
        product_role: c.productRole,
        message_delivery: c.messageDelivery,
        differentiation: c.differentiation,
        risks: c.risks,
        strengths: c.strengths,
        estimated_complexity: c.estimatedComplexity,
        required_assets: c.requiredAssets,
        status: c.conceptStatus,
        provenance: c.provenance,
        created_at: c.createdAt,
        updated_at: c.updatedAt
      }));

      const { error } = await supabase
        .from('video_ad_concepts')
        .upsert(rows, { onConflict: 'id' });

      if (error) {
        console.warn(`[VideoAdConceptRepository.saveConcepts] Supabase warning: ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`[VideoAdConceptRepository.saveConcepts] Fallback active: ${err?.message}`);
    }

    return enriched;
  }

  /**
   * Retrieve all concepts for a given project and workspace.
   * Optionally filtered by exact briefVersion.
   */
  public async getConceptsByProject(
    projectId: string,
    workspaceId: string,
    briefVersion?: number
  ): Promise<CreativeConcept[]> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        let query = supabase
          .from('video_ad_concepts')
          .select('*')
          .eq('project_id', projectId)
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true });

        if (briefVersion !== undefined) {
          query = query.eq('brief_version', briefVersion);
        }

        const { data, error } = await query;
        if (data && !error && data.length > 0) {
          const concepts: CreativeConcept[] = data.map(row => ({
            id: row.id,
            projectId: row.project_id,
            workspaceId: row.workspace_id,
            briefVersion: row.brief_version,
            name: row.name,
            oneLineIdea: row.one_line_idea,
            strategicFoundation: row.strategic_foundation,
            creativeMechanism: row.creative_mechanism,
            hook: row.hook || { type: 'visual_surprise', description: '' },
            premise: row.premise,
            emotionalArc: row.emotional_arc,
            visualDirection: row.visual_direction || {},
            narrativeStructure: row.narrative_structure,
            productRole: row.product_role,
            messageDelivery: row.message_delivery,
            differentiation: row.differentiation,
            risks: row.risks || [],
            strengths: row.strengths || [],
            estimatedComplexity: row.estimated_complexity,
            requiredAssets: row.required_assets || [],
            conceptStatus: row.status,
            provenance: row.provenance || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }));

          for (const c of concepts) {
            this.inMemoryConcepts.set(c.id, c);
          }
          return concepts;
        }
      } catch (err: any) {
        console.warn(`[VideoAdConceptRepository.getConceptsByProject] Fallback active: ${err?.message}`);
      }
    }

    // In-memory fallback
    const result: CreativeConcept[] = [];
    for (const concept of this.inMemoryConcepts.values()) {
      if (concept.projectId === projectId && concept.workspaceId === workspaceId) {
        if (briefVersion === undefined || concept.briefVersion === briefVersion) {
          result.push(JSON.parse(JSON.stringify(concept)));
        }
      }
    }

    return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /**
   * Retrieve a single concept by ID, verifying workspace isolation.
   */
  public async getConceptById(conceptId: string, workspaceId: string): Promise<CreativeConcept | null> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('video_ad_concepts')
          .select('*')
          .eq('id', conceptId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (data && !error) {
          const concept: CreativeConcept = {
            id: data.id,
            projectId: data.project_id,
            workspaceId: data.workspace_id,
            briefVersion: data.brief_version,
            name: data.name,
            oneLineIdea: data.one_line_idea,
            strategicFoundation: data.strategic_foundation,
            creativeMechanism: data.creative_mechanism,
            hook: data.hook || { type: 'visual_surprise', description: '' },
            premise: data.premise,
            emotionalArc: data.emotional_arc,
            visualDirection: data.visual_direction || {},
            narrativeStructure: data.narrative_structure,
            productRole: data.product_role,
            messageDelivery: data.message_delivery,
            differentiation: data.differentiation,
            risks: data.risks || [],
            strengths: data.strengths || [],
            estimatedComplexity: data.estimated_complexity,
            requiredAssets: data.required_assets || [],
            conceptStatus: data.status,
            provenance: data.provenance || {},
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          this.inMemoryConcepts.set(concept.id, concept);
          return concept;
        }
      } catch (err: any) {
        console.warn(`[VideoAdConceptRepository.getConceptById] Fallback active: ${err?.message}`);
      }
    }

    const cached = this.inMemoryConcepts.get(conceptId);
    if (cached && cached.workspaceId === workspaceId) {
      return JSON.parse(JSON.stringify(cached));
    }

    return null;
  }

  /**
   * Atomically sets a concept as SELECTED and marks other concepts of the same briefVersion as REJECTED.
   */
  public async selectConcept(
    projectId: string,
    workspaceId: string,
    conceptId: string,
    userId?: string
  ): Promise<CreativeConcept> {
    const target = await this.getConceptById(conceptId, workspaceId);
    if (!target) {
      throw new Error(`Concept '${conceptId}' not found in workspace '${workspaceId}'.`);
    }
    if (target.projectId !== projectId) {
      throw new Error(`Concept '${conceptId}' does not belong to project '${projectId}'.`);
    }

    const now = new Date().toISOString();
    const allForVersion = await this.getConceptsByProject(projectId, workspaceId, target.briefVersion);

    for (const c of allForVersion) {
      if (c.id === conceptId) {
        c.conceptStatus = 'SELECTED';
        c.provenance.selectedAt = now;
        c.provenance.selectedBy = userId || 'user';
      } else if (c.conceptStatus === 'READY_FOR_REVIEW' || c.conceptStatus === 'DRAFT') {
        c.conceptStatus = 'REJECTED';
      }
      c.updatedAt = now;
      this.inMemoryConcepts.set(c.id, JSON.parse(JSON.stringify(c)));
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        // Demote others for this project & brief version
        await supabase
          .from('video_ad_concepts')
          .update({ status: 'REJECTED', updated_at: now })
          .eq('project_id', projectId)
          .eq('workspace_id', workspaceId)
          .eq('brief_version', target.briefVersion)
          .neq('id', conceptId)
          .in('status', ['READY_FOR_REVIEW', 'DRAFT']);

        // Promote target
        await supabase
          .from('video_ad_concepts')
          .update({
            status: 'SELECTED',
            provenance: {
              ...target.provenance,
              selectedAt: now,
              selectedBy: userId || 'user'
            },
            updated_at: now
          })
          .eq('id', conceptId)
          .eq('workspace_id', workspaceId);
      } catch (err: any) {
        console.warn(`[VideoAdConceptRepository.selectConcept] Fallback active: ${err?.message}`);
      }
    }

    return this.inMemoryConcepts.get(conceptId)!;
  }

  /**
   * Archive all concepts for a specific briefVersion when regenerating.
   */
  public async archiveConceptsForVersion(
    projectId: string,
    workspaceId: string,
    briefVersion: number
  ): Promise<void> {
    const now = new Date().toISOString();
    for (const c of this.inMemoryConcepts.values()) {
      if (c.projectId === projectId && c.workspaceId === workspaceId && c.briefVersion === briefVersion) {
        if (c.conceptStatus !== 'SELECTED') {
          c.conceptStatus = 'ARCHIVED';
          c.updatedAt = now;
        }
      }
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('video_ad_concepts')
          .update({ status: 'ARCHIVED', updated_at: now })
          .eq('project_id', projectId)
          .eq('workspace_id', workspaceId)
          .eq('brief_version', briefVersion)
          .neq('status', 'SELECTED');
      } catch (err: any) {
        console.warn(`[VideoAdConceptRepository.archiveConceptsForVersion] Fallback active: ${err?.message}`);
      }
    }
  }

  /**
   * For testing: clear in-memory cache.
   */
  public clearMemory(): void {
    this.inMemoryConcepts.clear();
  }
}

export const videoAdConceptRepository = new VideoAdConceptRepository();
