import { getSupabaseAdmin } from '../../../infrastructure/supabase/supabaseClient.js';
import { calculateAdSpecHash } from '../services/videoAdHashService.js';
import { videoAdValidationService } from '../services/videoAdValidationService.js';
import type {
  AdSpec,
  VideoAdProjectSummary,
  AdCharacterEntity,
  AdProductEntity,
  AdSpecLocationEntity,
  AdShot,
  DecisionProvenance
} from '@contracts/adSpecContracts.js';

export class VideoAdProjectRepository {
  // In-memory fallback maps for resilience during local testing and development
  private inMemoryProjects = new Map<string, VideoAdProjectSummary>();
  private inMemoryVersions = new Map<string, {
    id: string;
    projectId: string;
    workspaceId: string;
    versionNumber: number;
    parentVersionId?: string;
    status: 'draft' | 'review' | 'approved' | 'archived';
    contentHash: string;
    spec: AdSpec;
    createdAt: string;
    approvedAt?: string;
    approvedBy?: string;
  }>();
  private inMemoryExecutions = new Map<string, {
    id: string;
    projectId: string;
    versionId: string;
    workspaceId: string;
    contentHash: string;
    frozenSpec: AdSpec;
    createdAt: string;
    approvedAt: string;
    approvedBy?: string;
  }>();

  /**
   * Create a new Video Ad Project with an initial AdSpec v1.
   */
  public async createProject(
    workspaceId: string,
    title: string,
    userId?: string,
    initialSpec?: Partial<AdSpec>
  ): Promise<{ project: VideoAdProjectSummary; adSpec: AdSpec }> {
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();

    const adId = initialSpec?.identity?.adId || `ad_${projectId.slice(0, 8)}`;

    // Build initial canonical AdSpec v1
    const baseSpec: AdSpec = {
      schemaVersion: '1.0.0',
      identity: {
        adId,
        specVersion: 1,
        revisionId: 'rev_v1_init',
        creativeState: 'discovery',
        executionState: 'idle',
        title,
        workspaceId,
        projectId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        ...initialSpec?.identity,
      },
      brief: {
        brandRef: 'brand_default',
        product: 'Default Product',
        objective: 'awareness',
        targetAudience: { persona: 'General Audience', painPoints: [] },
        platform: 'generic',
        desiredDurationSeconds: 15,
        aspectRatio: '16:9',
        language: 'en',
        cta: { visualText: 'Learn More', actionIntent: 'click_link' },
        keyMessage: 'Brand message',
        desiredResponse: 'Interest',
        tone: 'Professional and engaging',
        mustInclude: [],
        mustAvoid: [],
        referencesAndInspiration: [],
        userConstraints: [],
        ...initialSpec?.brief,
      },
      creative: {
        concepts: [],
        ...initialSpec?.creative,
      },
      brand: {
        adSpecificOverrides: {},
        priorityHierarchy: ['brand_restriction', 'campaign_rule', 'creative_direction', 'shot_preference'],
        ...initialSpec?.brand,
      },
      assets: {
        assets: [],
        ...initialSpec?.assets,
      },
      characters: initialSpec?.characters || [],
      products: initialSpec?.products || [],
      locations: initialSpec?.locations?.length ? initialSpec.locations : [
        {
          id: 'loc_default',
          name: 'Studio Stage',
          description: 'Clean minimalist commercial studio environment',
          referenceAssetIds: [],
          architecture: 'modern studio',
          spatialCharacteristics: {},
          lightingCharacteristics: {},
          palette: ['#FFFFFF', '#111827'],
          atmosphere: 'crisp lighting',
          continuityConstraints: [],
          locks: []
        }
      ],
      story: {
        structureType: 'minimal_hero',
        logline: '',
        beats: [],
        ...initialSpec?.story,
      },
      shots: initialSpec?.shots?.length ? initialSpec.shots : [
        {
          shotId: 'shot_01',
          sequence: 1,
          purpose: 'Opening Hook',
          narrativeRole: 'hook',
          timing: { startTime: 0, endTime: 15, duration: 15 },
          subjects: [],
          action: { startingState: 'Static hero view', action: 'Gentle reveal', choreography: 'Subtle motion', endingState: 'CTA hold' },
          environment: { locationId: 'loc_default' },
          camera: {
            shotSize: 'medium_close_up',
            framing: 'rule_of_thirds',
            angle: 'eye_level',
            lensCharacteristics: 'normal_prime_50mm',
            cameraPosition: 'front',
            cameraMovement: 'static',
            composition: 'clean centered',
            depthIntent: 'shallow_dof'
          },
          lighting: {
            source: 'softbox',
            direction: 'front_three_quarter',
            quality: 'soft_diffuse',
            intensity: 'balanced',
            contrast: 'medium',
            colorTemperature: '5600K',
            atmosphere: 'clean studio'
          },
          visualDirection: {
            visualIntent: 'Cinematic commercial polish',
            realismLevel: 'photorealistic',
            colorPalette: [],
            colorGrading: 'warm_commercial',
            motionPacing: 'calm'
          },
          audio: {
            soundEffects: [],
            audioPriority: 'medium'
          },
          transitions: { incoming: 'cut', outgoing: 'cut' },
          referencedAssetIds: [],
          continuity: { inheritedStates: [], producedStates: [] },
          constraints: { mustHappen: [], mustNotHappen: [] },
          qaExpectations: {
            requiredSubjects: [],
            requiredActions: [],
            forbiddenActions: [],
            requiredFraming: 'rule_of_thirds',
            requiredCameraMovement: 'static',
            productVisibility: 'prominent_front',
            characterIdentityRules: [],
            brandRules: []
          }
        }
      ],
      continuity: { links: [], ...initialSpec?.continuity },
      constraints: initialSpec?.constraints || [],
      generationIntent: {
        desiredDurationSeconds: 15,
        aspectRatio: '16:9',
        qualityIntent: 'cinematic_pro',
        audioRequired: false,
        continuityPriority: 'strict',
        realism: 'photorealistic',
        generationStrategy: 'shot_by_shot',
        modelRequirements: {
          requiresFirstFrame: false,
          requiresLastFrame: false,
          minimumReferenceCount: 0,
          requiresNativeAudio: false,
        },
        ...initialSpec?.generationIntent,
      },
      generationRequirements: {
        durationSeconds: 15,
        aspectRatio: '16:9',
        audioRequired: false,
        firstFrameRequired: false,
        lastFrameRequired: false,
        minimumReferenceCount: 0,
        continuityPriority: 'strict',
        qualityPriority: 'cinematic_pro',
        ...initialSpec?.generationRequirements,
      },
      decisionMetadata: initialSpec?.decisionMetadata || {},
      metadata: {
        authorId: userId || 'system',
        originatingGem: 'video_generation_gem',
        ...initialSpec?.metadata,
      },
    };

    const contentHash = calculateAdSpecHash(baseSpec);
    baseSpec.identity.revisionId = `rev_init_${contentHash.slice(0, 8)}`;

    const projectSummary: VideoAdProjectSummary = {
      id: projectId,
      workspaceId,
      title,
      status: 'draft',
      currentVersion: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Try database persistence with in-memory fallback
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { error: projErr } = await supabase
          .from('video_ad_projects')
          .insert({
            id: projectId,
            workspace_id: workspaceId,
            created_by: userId || null,
            title,
            status: 'draft',
            current_version: 1,
            created_at: now,
            updated_at: now,
          });

        if (!projErr) {
          await this.persistNormalizedVersion(projectId, workspaceId, 1, baseSpec, contentHash, userId);
        }
      } catch {
        // Fallback to in-memory
      }
    }

    // In-memory update
    this.inMemoryProjects.set(projectId, projectSummary);
    this.inMemoryVersions.set(`${projectId}_v1`, {
      id: crypto.randomUUID(),
      projectId,
      workspaceId,
      versionNumber: 1,
      status: 'draft',
      contentHash,
      spec: JSON.parse(JSON.stringify(baseSpec)),
      createdAt: now,
    });

    return { project: projectSummary, adSpec: baseSpec };
  }

  /**
   * Retrieve project summary by ID, verifying workspace tenancy.
   */
  public async getProject(projectId: string, workspaceId: string): Promise<VideoAdProjectSummary | null> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('video_ad_projects')
          .select('*')
          .eq('id', projectId)
          .eq('workspace_id', workspaceId)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            workspaceId: data.workspace_id,
            title: data.title,
            status: data.status,
            currentVersion: data.current_version,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch {
        // fallback
      }
    }

    const mem = this.inMemoryProjects.get(projectId);
    if (mem && mem.workspaceId === workspaceId) {
      return mem;
    }
    return null;
  }

  /**
   * Retrieve current AdSpec for a project, assembling from normalized storage.
   */
  public async getCurrentAdSpec(projectId: string, workspaceId: string): Promise<AdSpec | null> {
    const project = await this.getProject(projectId, workspaceId);
    if (!project) return null;
    return this.getAdSpecVersion(projectId, workspaceId, project.currentVersion);
  }

  /**
   * Retrieve a specific historical AdSpec version by version number.
   * Enforces immutability: returns exact historical snapshot.
   */
  public async getAdSpecVersion(
    projectId: string,
    workspaceId: string,
    versionNumber: number
  ): Promise<AdSpec | null> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data: verRow, error: verErr } = await supabase
          .from('video_ad_spec_versions')
          .select('*')
          .eq('project_id', projectId)
          .eq('workspace_id', workspaceId)
          .eq('version_number', versionNumber)
          .single();

        if (!verErr && verRow) {
          return this.assembleSpecFromDatabase(verRow);
        }
      } catch {
        // fallback
      }
    }

    const mem = this.inMemoryVersions.get(`${projectId}_v${versionNumber}`);
    if (mem && mem.workspaceId === workspaceId) {
      return JSON.parse(JSON.stringify(mem.spec));
    }
    return null;
  }

  /**
   * Create a new immutable version N+1.
   * INVARIANT: Never overwrites version N in place.
   */
  public async createVersion(
    projectId: string,
    workspaceId: string,
    newSpec: AdSpec,
    reason?: string,
    actorId?: string
  ): Promise<{ versionNumber: number; contentHash: string; adSpec: AdSpec }> {
    const project = await this.getProject(projectId, workspaceId);
    if (!project) {
      throw new Error(`Project '${projectId}' not found in workspace '${workspaceId}'`);
    }

    const currentVersion = project.currentVersion;
    const nextVersionNumber = currentVersion + 1;
    const now = new Date().toISOString();

    // Fetch previous version to validate locks
    const previousSpec = await this.getAdSpecVersion(projectId, workspaceId, currentVersion);

    // Validate new spec
    const validation = videoAdValidationService.validateAdSpec(newSpec, previousSpec || undefined);
    if (!validation.valid) {
      const firstErr = validation.errors[0];
      throw new Error(`AdSpec validation failed: [${firstErr.code}] ${firstErr.message}`);
    }

    // Compute deterministic content hash
    const contentHash = calculateAdSpecHash(newSpec);

    // Deep copy and stamp identity
    const versionedSpec: AdSpec = JSON.parse(JSON.stringify(newSpec));
    versionedSpec.identity.specVersion = nextVersionNumber;
    versionedSpec.identity.parentVersionId = `${projectId}_v${currentVersion}`;
    versionedSpec.identity.revisionId = `rev_v${nextVersionNumber}_${contentHash.slice(0, 8)}`;
    versionedSpec.identity.updatedAt = now;

    // Record decision provenance for the revision
    if (!versionedSpec.decisionMetadata) {
      versionedSpec.decisionMetadata = {};
    }
    versionedSpec.decisionMetadata[`version_${nextVersionNumber}`] = {
      source: 'user_requested',
      confidence: 1.0,
      status: 'confirmed',
      locked: false,
      confirmedAt: now,
      confirmedBy: actorId || 'user',
      reason: reason || `Version ${nextVersionNumber} created`,
    };

    // Database persistence
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await this.persistNormalizedVersion(
          projectId,
          workspaceId,
          nextVersionNumber,
          versionedSpec,
          contentHash,
          actorId
        );

        await supabase
          .from('video_ad_projects')
          .update({
            current_version: nextVersionNumber,
            updated_at: now,
          })
          .eq('id', projectId)
          .eq('workspace_id', workspaceId);
      } catch {
        // Fallback to in-memory
      }
    }

    // In-memory update
    project.currentVersion = nextVersionNumber;
    project.updatedAt = now;
    this.inMemoryProjects.set(projectId, project);

    this.inMemoryVersions.set(`${projectId}_v${nextVersionNumber}`, {
      id: crypto.randomUUID(),
      projectId,
      workspaceId,
      versionNumber: nextVersionNumber,
      parentVersionId: `${projectId}_v${currentVersion}`,
      status: 'draft',
      contentHash,
      spec: JSON.parse(JSON.stringify(versionedSpec)),
      createdAt: now,
    });

    return {
      versionNumber: nextVersionNumber,
      contentHash,
      adSpec: versionedSpec,
    };
  }

  /**
   * List all versions for a project.
   */
  public async listVersions(projectId: string, workspaceId: string): Promise<Array<{
    id: string;
    versionNumber: number;
    parentVersionId?: string;
    status: string;
    contentHash: string;
    createdAt: string;
    approvedAt?: string;
  }>> {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('video_ad_spec_versions')
          .select('id, version_number, parent_version_id, status, content_hash, created_at, approved_at')
          .eq('project_id', projectId)
          .eq('workspace_id', workspaceId)
          .order('version_number', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            versionNumber: d.version_number,
            parentVersionId: d.parent_version_id,
            status: d.status,
            contentHash: d.content_hash,
            createdAt: d.created_at,
            approvedAt: d.approved_at,
          }));
        }
      } catch {
        // fallback
      }
    }

    const results = [];
    for (const [key, val] of this.inMemoryVersions.entries()) {
      if (key.startsWith(`${projectId}_`) && val.workspaceId === workspaceId) {
        results.push({
          id: val.id,
          versionNumber: val.versionNumber,
          parentVersionId: val.parentVersionId,
          status: val.status,
          contentHash: val.contentHash,
          createdAt: val.createdAt,
          approvedAt: val.approvedAt,
        });
      }
    }
    return results.sort((a, b) => a.versionNumber - b.versionNumber);
  }

  /**
   * Approve a specific AdSpec version. Locks version against further mutation.
   */
  public async approveVersion(
    projectId: string,
    workspaceId: string,
    versionNumber: number,
    approverId?: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();

    if (supabase) {
      try {
        const { error } = await supabase
          .from('video_ad_spec_versions')
          .update({
            status: 'approved',
            approved_by: approverId || null,
            approved_at: now,
          })
          .eq('project_id', projectId)
          .eq('workspace_id', workspaceId)
          .eq('version_number', versionNumber);

        if (!error) {
          await supabase
            .from('video_ad_projects')
            .update({ status: 'approved', updated_at: now })
            .eq('id', projectId)
            .eq('workspace_id', workspaceId);
        }
      } catch {
        // fallback
      }
    }

    const mem = this.inMemoryVersions.get(`${projectId}_v${versionNumber}`);
    if (mem && mem.workspaceId === workspaceId) {
      mem.status = 'approved';
      mem.approvedAt = now;
      mem.approvedBy = approverId;
      mem.spec.identity.creativeState = 'approved';
      const proj = this.inMemoryProjects.get(projectId);
      if (proj) {
        proj.status = 'approved';
        proj.updatedAt = now;
      }
      return true;
    }

    return false;
  }

  /**
   * Foundation: Create execution snapshot from approved version.
   */
  public async createExecutionSnapshot(
    projectId: string,
    workspaceId: string,
    versionNumber?: number,
    executionSettings?: Record<string, any>,
    userId?: string
  ): Promise<{ snapshotId: string; versionNumber: number; contentHash: string }> {
    const project = await this.getProject(projectId, workspaceId);
    if (!project) throw new Error('Project not found');

    const targetVer = versionNumber || project.currentVersion;
    const spec = await this.getAdSpecVersion(projectId, workspaceId, targetVer);
    if (!spec) throw new Error(`Version ${targetVer} not found`);

    if (spec.identity.creativeState !== 'approved') {
      throw new Error(`Cannot create execution snapshot from unapproved version (current status: ${spec.identity.creativeState})`);
    }

    const snapshotId = crypto.randomUUID();
    const contentHash = calculateAdSpecHash(spec);
    const now = new Date().toISOString();

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('video_ad_executions')
          .insert({
            id: snapshotId,
            project_id: projectId,
            version_id: crypto.randomUUID(),
            workspace_id: workspaceId,
            content_hash: contentHash,
            frozen_spec: spec,
            execution_settings: executionSettings || {},
            approved_by: userId || null,
            approved_at: now,
            created_at: now,
          });
      } catch {
        // fallback
      }
    }

    this.inMemoryExecutions.set(snapshotId, {
      id: snapshotId,
      projectId,
      versionId: `${projectId}_v${targetVer}`,
      workspaceId,
      contentHash,
      frozenSpec: JSON.parse(JSON.stringify(spec)),
      createdAt: now,
      approvedAt: now,
      approvedBy: userId,
    });

    return {
      snapshotId,
      versionNumber: targetVer,
      contentHash,
    };
  }

  // ===========================================================================
  // PRIVATE PERSISTENCE & DECOMPOSITION HELPERS
  // ===========================================================================

  private async persistNormalizedVersion(
    projectId: string,
    workspaceId: string,
    versionNumber: number,
    spec: AdSpec,
    contentHash: string,
    userId?: string
  ): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    const versionId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. Insert version row
    await supabase
      .from('video_ad_spec_versions')
      .insert({
        id: versionId,
        project_id: projectId,
        workspace_id: workspaceId,
        version_number: versionNumber,
        status: spec.identity.creativeState || 'draft',
        brief: spec.brief || {},
        creative: spec.creative || {},
        brand_rules: spec.brand || {},
        audio: spec.audio || {},
        story: spec.story || {},
        continuity: spec.continuity || {},
        constraints: spec.constraints || [],
        generation_requirements: spec.generationRequirements || {},
        schema_version: spec.schemaVersion || '1.0.0',
        content_hash: contentHash,
        created_by: userId || null,
        created_at: now,
      });

    // 2. Insert characters
    if (spec.characters?.length) {
      const charRows = spec.characters.map(c => ({
        id: c.id,
        version_id: versionId,
        project_id: projectId,
        workspace_id: workspaceId,
        name: c.displayName || c.name || c.id,
        narrative_role: c.narrativeRole || 'protagonist',
        appearance: c.appearance || {},
        wardrobe: c.wardrobe || {},
        reference_asset_ids: c.referenceAssetIds || [],
        behavior_personality: c.behaviorPersonality || '',
        locks: c.locks || [],
        continuity_constraints: c.continuityConstraints || [],
        forbidden_changes: c.forbiddenChanges || [],
        created_at: now,
      }));
      await supabase.from('video_ad_characters').insert(charRows);
    }

    // 3. Insert products
    if (spec.products?.length) {
      const prodRows = spec.products.map(p => ({
        id: p.id,
        version_id: versionId,
        project_id: projectId,
        workspace_id: workspaceId,
        name: p.name,
        visual_description: p.visualDescription || '',
        shape_form: p.shapeForm || '',
        materials: p.materials || [],
        color_palette: p.colorPalette || [],
        packaging: p.packaging || {},
        branding: p.branding || {},
        reference_asset_ids: p.referenceAssetIds || [],
        locks: p.locks || [],
        allowed_transformations: p.allowedTransformations || [],
        forbidden_transformations: p.forbiddenTransformations || [],
        continuity_requirements: p.continuityRequirements || [],
        created_at: now,
      }));
      await supabase.from('video_ad_products').insert(prodRows);
    }

    // 4. Insert locations
    if (spec.locations?.length) {
      const locRows = spec.locations.map(l => ({
        id: l.id,
        version_id: versionId,
        project_id: projectId,
        workspace_id: workspaceId,
        name: l.name,
        description: l.description || '',
        architecture: l.architecture || '',
        spatial_characteristics: l.spatialCharacteristics || {},
        lighting_characteristics: l.lightingCharacteristics || {},
        palette: l.palette || [],
        atmosphere: l.atmosphere || '',
        reference_asset_ids: l.referenceAssetIds || [],
        continuity_constraints: l.continuityConstraints || [],
        locks: l.locks || [],
        created_at: now,
      }));
      await supabase.from('video_ad_locations').insert(locRows);
    }

    // 5. Insert shots
    if (spec.shots?.length) {
      const shotRows = spec.shots.map(s => ({
        id: s.shotId,
        version_id: versionId,
        project_id: projectId,
        workspace_id: workspaceId,
        sequence_order: s.sequence,
        duration_seconds: s.timing?.duration || 0,
        purpose: s.purpose || '',
        narrative_role: s.narrativeRole || '',
        location_id: s.environment?.locationId || null,
        action: s.action || {},
        camera: s.camera || {},
        lighting: s.lighting || {},
        visual_direction: s.visualDirection || {},
        audio: s.audio || {},
        transitions: s.transitions || {},
        referenced_asset_ids: s.referencedAssetIds || [],
        continuity: s.continuity || {},
        constraints: s.constraints || {},
        qa_expectations: s.qaExpectations || {},
        created_at: now,
      }));
      await supabase.from('video_ad_shots').insert(shotRows);
    }

    // 6. Insert decisions
    if (spec.decisionMetadata && Object.keys(spec.decisionMetadata).length > 0) {
      const decRows = Object.entries(spec.decisionMetadata).map(([fieldPath, d]) => ({
        version_id: versionId,
        project_id: projectId,
        workspace_id: workspaceId,
        field_path: fieldPath,
        source: d.source || 'user_requested',
        actor_id: userId || null,
        reason: d.reason || null,
        is_locked: !!d.locked,
        lock_scope: null,
        confirmed_at: d.confirmedAt || now,
        created_at: now,
      }));
      await supabase.from('video_ad_decisions').insert(decRows);
    }
  }

  private async assembleSpecFromDatabase(verRow: any): Promise<AdSpec> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    const versionId = verRow.id;

    // Fetch child tables in parallel
    const [
      { data: characters },
      { data: products },
      { data: locations },
      { data: shots },
      { data: decisions },
    ] = await Promise.all([
      supabase.from('video_ad_characters').select('*').eq('version_id', versionId),
      supabase.from('video_ad_products').select('*').eq('version_id', versionId),
      supabase.from('video_ad_locations').select('*').eq('version_id', versionId),
      supabase.from('video_ad_shots').select('*').eq('version_id', versionId).order('sequence_order'),
      supabase.from('video_ad_decisions').select('*').eq('version_id', versionId),
    ]);

    const assembledCharacters: AdCharacterEntity[] = (characters || []).map(c => ({
      id: c.id,
      name: c.name,
      displayName: c.name,
      narrativeRole: c.narrative_role as any,
      appearance: c.appearance,
      wardrobe: c.wardrobe,
      referenceAssetIds: c.reference_asset_ids,
      behaviorPersonality: c.behavior_personality,
      locks: c.locks,
      continuityConstraints: c.continuity_constraints,
      forbiddenChanges: c.forbidden_changes,
    }));

    const assembledProducts: AdProductEntity[] = (products || []).map(p => ({
      id: p.id,
      name: p.name,
      referenceAssetIds: p.reference_asset_ids,
      visualDescription: p.visual_description,
      shapeForm: p.shape_form,
      materials: p.materials,
      colorPalette: p.color_palette,
      packaging: p.packaging,
      branding: p.branding,
      labelLogoConstraints: [],
      orientationConstraints: [],
      allowedTransformations: p.allowed_transformations,
      forbiddenTransformations: p.forbidden_transformations,
      continuityRequirements: p.continuity_requirements,
      locks: p.locks,
    }));

    const assembledLocations: AdSpecLocationEntity[] = (locations || []).map(l => ({
      id: l.id,
      name: l.name,
      description: l.description,
      referenceAssetIds: l.reference_asset_ids,
      architecture: l.architecture,
      spatialCharacteristics: l.spatial_characteristics,
      lightingCharacteristics: l.lighting_characteristics,
      palette: l.palette,
      atmosphere: l.atmosphere,
      continuityConstraints: l.continuity_constraints,
      locks: l.locks,
    }));

    const assembledShots: AdShot[] = (shots || []).map(s => ({
      shotId: s.id,
      sequence: s.sequence_order,
      purpose: s.purpose,
      narrativeRole: s.narrative_role,
      timing: {
        startTime: 0,
        endTime: Number(s.duration_seconds),
        duration: Number(s.duration_seconds),
      },
      subjects: [],
      action: s.action,
      environment: { locationId: s.location_id || 'loc_default' },
      camera: s.camera,
      lighting: s.lighting,
      visualDirection: s.visual_direction,
      audio: s.audio,
      transitions: s.transitions,
      referencedAssetIds: s.referenced_asset_ids,
      continuity: s.continuity,
      constraints: s.constraints,
      qaExpectations: s.qa_expectations,
    }));

    const assembledDecisions: Record<string, DecisionProvenance> = {};
    for (const d of decisions || []) {
      assembledDecisions[d.field_path] = {
        source: d.source,
        confidence: 1.0,
        status: d.is_locked ? 'confirmed' : 'unconfirmed',
        locked: d.is_locked,
        confirmedAt: d.confirmed_at,
        reason: d.reason,
      };
    }

    return {
      schemaVersion: verRow.schema_version || '1.0.0',
      identity: {
        adId: `ad_${verRow.project_id.slice(0, 8)}`,
        specVersion: verRow.version_number,
        revisionId: `rev_v${verRow.version_number}_${verRow.content_hash.slice(0, 8)}`,
        parentVersionId: verRow.parent_version_id,
        creativeState: verRow.status,
        executionState: 'idle',
        title: `Video Ad Project`,
        workspaceId: verRow.workspace_id,
        projectId: verRow.project_id,
        createdBy: verRow.created_by,
        createdAt: verRow.created_at,
        updatedAt: verRow.created_at,
      },
      brief: verRow.brief,
      creative: verRow.creative,
      brand: verRow.brand_rules,
      assets: { assets: [] },
      characters: assembledCharacters,
      products: assembledProducts,
      locations: assembledLocations,
      story: verRow.story || { structureType: 'minimal_hero', logline: '', beats: [] },
      shots: assembledShots,
      continuity: verRow.continuity || { links: [] },
      constraints: verRow.constraints || [],
      generationIntent: {
        desiredDurationSeconds: verRow.brief?.desiredDurationSeconds || 15,
        aspectRatio: verRow.brief?.aspectRatio || '16:9',
        qualityIntent: 'cinematic_pro',
        audioRequired: false,
        continuityPriority: 'strict',
        realism: 'photorealistic',
        generationStrategy: 'shot_by_shot',
        modelRequirements: {
          requiresFirstFrame: false,
          requiresLastFrame: false,
          minimumReferenceCount: 0,
          requiresNativeAudio: false,
        },
      },
      generationRequirements: verRow.generation_requirements,
      decisionMetadata: assembledDecisions,
      metadata: {
        authorId: verRow.created_by || 'system',
        originatingGem: 'video_generation_gem',
      },
    };
  }

  public clearMemory(): void {
    this.inMemoryProjects.clear();
    this.inMemoryVersions.clear();
    this.inMemoryExecutions.clear();
  }
}

export const videoAdProjectRepository = new VideoAdProjectRepository();
