import { videoAdConceptRepository } from '../repositories/videoAdConceptRepository.js';
import { videoAdProjectRepository } from '../repositories/videoAdProjectRepository.js';
import { videoAdDiscoveryRepository } from '../repositories/videoAdDiscoveryRepository.js';
import { creativeDirectorAiService } from './creativeDirectorAiService.js';
import { conceptQualityAndDiversityService } from './conceptQualityAndDiversityService.js';
import type {
  AdSpec,
  CreativeConcept,
  CreativeConceptItem,
  GenerateConceptsResponse,
  GetConceptsResponse,
  SelectConceptResponse,
  RegenerateConceptsResponse
} from '@contracts/adSpecContracts.js';

export class CreativeConceptService {
  /**
   * Generates a batch of distinct, strategically grounded creative concepts from a confirmed brief.
   */
  public async generateConcepts(params: {
    projectId: string;
    workspaceId: string;
    targetCount?: number;
    creativeNotes?: string;
    userId?: string;
  }): Promise<GenerateConceptsResponse> {
    const { projectId, workspaceId, targetCount = 3, creativeNotes, userId } = params;

    // 1. Verify project exists
    const project = await videoAdProjectRepository.getProject(projectId, workspaceId);
    if (!project) {
      throw new Error(`Project '${projectId}' not found in workspace '${workspaceId}'.`);
    }

    // 2. Fetch current AdSpec
    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found.`);
    }

    // 3. Verify brief is confirmed before creative concept generation
    const discoverySession = await videoAdDiscoveryRepository.getSession(projectId, workspaceId);
    const isConfirmedInSession = discoverySession?.isBriefConfirmed === true;
    const isConfirmedInSpec = currentSpec.identity.creativeState === 'brief_ready' || currentSpec.identity.creativeState === 'concept_selected';

    if (!isConfirmedInSession && !isConfirmedInSpec) {
      throw new Error('BRIEF_NOT_CONFIRMED: Cannot generate creative concepts until the advertising brief is validated and confirmed by the user.');
    }

    if (!currentSpec.brief.product || !currentSpec.brief.objective) {
      throw new Error('BRIEF_INCOMPLETE: The advertising brief is missing required product or objective information.');
    }

    // 4. Gather available assets from AdSpec
    const availableAssets = (currentSpec.assets?.assets || []).map(a => ({
      id: a.assetId,
      name: a.label || a.assetId,
      role: a.semanticRole || 'general'
    }));

    // 5. Invoke Creative Director AI Service
    const concepts = await creativeDirectorAiService.generateConcepts({
      projectId,
      workspaceId,
      briefVersion: currentSpec.identity.specVersion,
      confirmedBrief: currentSpec.brief,
      availableAssets,
      brandGuidelines: currentSpec.brand?.globalGuidelines?.brandTone,
      targetCount,
      creativeNotes
    });

    // 6. Validate each concept for quality
    for (const concept of concepts) {
      const quality = conceptQualityAndDiversityService.evaluateQuality(concept, currentSpec.brief);
      if (!quality.passed) {
        console.warn(`[CreativeConceptService] Concept quality warnings for '${concept.name}':`, quality.issues);
      }
    }

    // 7. Validate concept diversity across the batch
    const diversity = conceptQualityAndDiversityService.evaluateDiversity(concepts);
    if (!diversity.isDiverse) {
      console.warn(`[CreativeConceptService] Diversity threshold alert:`, diversity.rejectionReason);
    }

    // 8. Persist concepts to repository
    const saved = await videoAdConceptRepository.saveConcepts(concepts, workspaceId);

    return {
      concepts: saved,
      diversity,
      briefVersion: currentSpec.identity.specVersion
    };
  }

  /**
   * Retrieves concepts for a project with stale detection.
   */
  public async getConcepts(projectId: string, workspaceId: string): Promise<GetConceptsResponse> {
    const project = await videoAdProjectRepository.getProject(projectId, workspaceId);
    if (!project) {
      throw new Error(`Project '${projectId}' not found in workspace '${workspaceId}'.`);
    }

    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found.`);
    }

    const allConcepts = await videoAdConceptRepository.getConceptsByProject(projectId, workspaceId);
    const activeBriefVersion = currentSpec.identity.specVersion;

    // Filter concepts for the current brief version if any exist; otherwise show historical
    const currentVersionConcepts = allConcepts.filter(c => c.briefVersion === activeBriefVersion);
    const conceptsToShow = currentVersionConcepts.length > 0 ? currentVersionConcepts : allConcepts;

    const isStale = conceptsToShow.length > 0 && conceptsToShow.some(c => c.briefVersion !== activeBriefVersion);
    const selectedConcept = conceptsToShow.find(c => c.conceptStatus === 'SELECTED');

    return {
      concepts: conceptsToShow,
      selectedConceptId: selectedConcept?.id || currentSpec.creative?.selectedConceptId,
      briefVersion: activeBriefVersion,
      isStale
    };
  }

  /**
   * Retrieves a single concept by ID.
   */
  public async getConceptById(conceptId: string, workspaceId: string): Promise<CreativeConcept | null> {
    return videoAdConceptRepository.getConceptById(conceptId, workspaceId);
  }

  /**
   * User explicitly selects a concept.
   * Atomically records user decision, updates AdSpec creative state,
   * locks the decision against silent AI overwrite, and advances AdSpec to Version N+1.
   */
  public async selectConcept(params: {
    projectId: string;
    workspaceId: string;
    conceptId: string;
    userRationale?: string;
    userId?: string;
  }): Promise<SelectConceptResponse> {
    const { projectId, workspaceId, conceptId, userRationale, userId } = params;

    // 1. Fetch target concept
    const targetConcept = await videoAdConceptRepository.getConceptById(conceptId, workspaceId);
    if (!targetConcept) {
      throw new Error(`Concept '${conceptId}' not found in workspace '${workspaceId}'.`);
    }
    if (targetConcept.projectId !== projectId) {
      throw new Error(`Concept '${conceptId}' does not belong to project '${projectId}'.`);
    }

    // 2. Fetch current AdSpec
    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found.`);
    }

    // 3. Stale concept check: cannot select a concept from an outdated brief version
    if (targetConcept.briefVersion !== currentSpec.identity.specVersion) {
      throw new Error(
        `STALE_CONCEPT_SELECTION: Cannot select a concept generated from brief version ${targetConcept.briefVersion}. Current active version is ${currentSpec.identity.specVersion}. Please generate new concepts for the current brief.`
      );
    }

    // 4. Atomically select concept in repository (sets status to SELECTED, others to REJECTED)
    const selectedConcept = await videoAdConceptRepository.selectConcept(
      projectId,
      workspaceId,
      conceptId,
      userId
    );

    // 5. Map all concepts for this brief version to canonical CreativeConceptItem format
    const allConcepts = await videoAdConceptRepository.getConceptsByProject(projectId, workspaceId, targetConcept.briefVersion);
    const conceptItems: CreativeConceptItem[] = allConcepts.map(c => ({
      conceptId: c.id,
      name: c.name,
      oneLinePremise: c.oneLineIdea,
      coreIdea: c.premise,
      hook: {
        hookType: (c.hook.type as any) || 'visual_surprise',
        description: c.hook.description
      },
      narrativeMechanism: c.narrativeStructure,
      visualMechanism: c.creativeMechanism,
      emotionalArc: c.emotionalArc,
      brandRole: c.productRole,
      intendedAudienceEffect: c.differentiation,
      noveltyRationale: c.strategicFoundation,
      complexityEstimate: c.estimatedComplexity,
      feasibilityNotes: c.risks.join('; ')
    }));

    const now = new Date().toISOString();

    // 6. Build new version of AdSpec with selected concept and locked decision
    const nextSpec: AdSpec = {
      ...currentSpec,
      identity: {
        ...currentSpec.identity,
        creativeState: 'concept_selected',
        updatedAt: now
      },
      creative: {
        ...currentSpec.creative,
        concepts: conceptItems,
        selectedConceptId: selectedConcept.id,
        selectionProvenance: {
          selectedBy: 'user',
          selectedAt: now
        }
      },
      decisionMetadata: {
        ...currentSpec.decisionMetadata,
        'creative.selectedConceptId': {
          source: 'user_selected',
          confidence: 1.0,
          status: 'confirmed',
          locked: true,
          confirmedAt: now,
          confirmedBy: userId || 'user',
          reason: userRationale || `Selected creative direction '${selectedConcept.name}'`
        }
      }
    };

    // 7. Advance AdSpec to Version N+1 with immutability guarantees
    const versionResult = await videoAdProjectRepository.createVersion(
      projectId,
      workspaceId,
      nextSpec,
      `Creative concept selected: ${selectedConcept.name}`,
      userId
    );

    return {
      success: true,
      selectedConcept,
      adSpecVersionNumber: versionResult.versionNumber,
      adSpec: versionResult.adSpec
    };
  }

  /**
   * Regenerates concepts by intentionally exploring alternative mechanisms
   * while avoiding previous patterns.
   */
  public async regenerateConcepts(params: {
    projectId: string;
    workspaceId: string;
    targetCount?: number;
    creativeNotes?: string;
    archivePrevious?: boolean;
    userId?: string;
  }): Promise<RegenerateConceptsResponse> {
    const { projectId, workspaceId, targetCount = 3, creativeNotes, archivePrevious = true } = params;

    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found.`);
    }

    // Load existing concepts as negative examples to guarantee diversity
    const allConcepts = await videoAdConceptRepository.getConceptsByProject(projectId, workspaceId);
    const existingForVersion = allConcepts.filter(c => c.briefVersion === currentSpec.identity.specVersion);
    const negativeConcepts = existingForVersion.length > 0 ? existingForVersion : allConcepts.slice(-3);

    const availableAssets = (currentSpec.assets?.assets || []).map(a => ({
      id: a.assetId,
      name: a.label || a.assetId,
      role: a.semanticRole || 'general'
    }));

    // Generate new concepts with negative examples
    const newConcepts = await creativeDirectorAiService.generateConcepts({
      projectId,
      workspaceId,
      briefVersion: currentSpec.identity.specVersion,
      confirmedBrief: currentSpec.brief,
      availableAssets,
      brandGuidelines: currentSpec.brand?.globalGuidelines?.brandTone,
      targetCount,
      negativeConcepts,
      creativeNotes
    });

    // Archive previous concepts if requested
    if (archivePrevious) {
      await videoAdConceptRepository.archiveConceptsForVersion(
        projectId,
        workspaceId,
        currentSpec.identity.specVersion
      );
    }

    // Validate diversity
    const diversity = conceptQualityAndDiversityService.evaluateDiversity(newConcepts);

    // Persist new concepts
    const saved = await videoAdConceptRepository.saveConcepts(newConcepts, workspaceId);

    return {
      concepts: saved,
      diversity,
      briefVersion: currentSpec.identity.specVersion
    };
  }
}

export const creativeConceptService = new CreativeConceptService();
