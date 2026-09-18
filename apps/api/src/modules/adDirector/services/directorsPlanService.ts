import { videoAdProjectRepository } from '../repositories/videoAdProjectRepository.js';
import { videoAdConceptRepository } from '../repositories/videoAdConceptRepository.js';
import { videoAdValidationService } from './videoAdValidationService.js';
import { storyArchitectAiService } from './storyArchitectAiService.js';
import { shotPlannerAiService } from './shotPlannerAiService.js';
import { continuityResolverService } from './continuityResolverService.js';
import type {
  AdSpec,
  CreativeConcept,
  AdCharacterEntity,
  AdProductEntity,
  AdSpecLocationEntity,
  StoryModel,
  AdShot,
  GenerateDirectorsPlanResponse,
  GetDirectorsPlanResponse,
  ConfirmDirectorsPlanResponse,
  ContinuityStatusReport
} from '@contracts/adSpecContracts.js';

export class DirectorsPlanService {
  /**
   * Transforms the selected creative concept into a production-ready, shot-level Director's Plan.
   * Enforces referential integrity, exact temporal timing, and entity continuity.
   */
  public async generateDirectorsPlan(params: {
    projectId: string;
    workspaceId: string;
    targetDurationSeconds?: number;
    cinematographyStyle?: string;
    pacingPreference?: string;
    userId?: string;
  }): Promise<GenerateDirectorsPlanResponse> {
    const { projectId, workspaceId, targetDurationSeconds, cinematographyStyle, pacingPreference, userId } = params;

    // 1. Verify project & load current AdSpec
    const project = await videoAdProjectRepository.getProject(projectId, workspaceId);
    if (!project) {
      throw new Error(`Project '${projectId}' not found in workspace '${workspaceId}'.`);
    }

    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found.`);
    }

    // 2. Enforce concept selection requirement
    const selectedConceptId = currentSpec.creative?.selectedConceptId;
    if (!selectedConceptId) {
      throw new Error('CONCEPT_NOT_SELECTED: Cannot generate Director\'s Plan until a creative concept is selected.');
    }

    // 3. Resolve selected concept details
    let selectedConcept: CreativeConcept | null = null;
    const conceptFromRepo = await videoAdConceptRepository.getConceptById(selectedConceptId, workspaceId);
    if (conceptFromRepo) {
      selectedConcept = conceptFromRepo;
    } else {
      // Fallback to concepts stored in AdSpec.creative.concepts
      const conceptItem = (currentSpec.creative?.concepts || []).find((c: any) => c.conceptId === selectedConceptId);
      if (conceptItem) {
        selectedConcept = {
          id: conceptItem.conceptId,
          projectId,
          workspaceId,
          briefVersion: currentSpec.identity.specVersion,
          name: conceptItem.name,
          oneLineIdea: conceptItem.oneLinePremise,
          strategicFoundation: conceptItem.noveltyRationale,
          creativeMechanism: conceptItem.visualMechanism,
          hook: {
            type: conceptItem.hook?.hookType || 'visual_surprise',
            description: conceptItem.hook?.description || ''
          },
          premise: conceptItem.coreIdea,
          emotionalArc: conceptItem.emotionalArc,
          visualDirection: {
            visualLanguage: 'Cinematic commercial polish',
            environment: 'Studio / Location',
            colorDirection: 'High dynamic range',
            energy: 'Dynamic',
            realismLevel: 'photorealistic'
          },
          narrativeStructure: conceptItem.narrativeMechanism,
          productRole: (conceptItem.brandRole as any) || 'solution',
          messageDelivery: 'visual_demonstration',
          differentiation: conceptItem.intendedAudienceEffect,
          risks: [],
          strengths: [],
          estimatedComplexity: conceptItem.complexityEstimate || 'medium',
          requiredAssets: [],
          conceptStatus: 'SELECTED',
          provenance: {
            generatedBy: 'ai_director',
            generatedAt: new Date().toISOString()
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }

    if (!selectedConcept) {
      throw new Error(`Selected concept '${selectedConceptId}' could not be resolved.`);
    }

    // 4. Ensure character, product, and location bibles with stable IDs
    const characters = this.ensureCharacters(currentSpec, selectedConcept);
    const products = this.ensureProducts(currentSpec, selectedConcept);
    const locations = this.ensureLocations(currentSpec, selectedConcept);

    // 5. Invoke Story Architect AI Service
    const storyModel = await storyArchitectAiService.generateStoryModel({
      brief: currentSpec.brief,
      selectedConcept,
      brandGuidelines: currentSpec.brand?.globalGuidelines,
      targetDurationSeconds: targetDurationSeconds || (typeof currentSpec.brief.desiredDurationSeconds === 'number' ? currentSpec.brief.desiredDurationSeconds : 15),
      cinematographyStyle
    });

    // 6. Invoke Shot Planner AI Service
    const shots = await shotPlannerAiService.planShots({
      storyModel,
      selectedConcept,
      brief: currentSpec.brief,
      characters,
      products,
      locations,
      assets: currentSpec.assets?.assets,
      targetTotalDurationSeconds: targetDurationSeconds || (typeof currentSpec.brief.desiredDurationSeconds === 'number' ? currentSpec.brief.desiredDurationSeconds : 15),
      cinematographyStyle
    });

    // 7. Invoke Continuity Resolver Service
    const continuityReport = continuityResolverService.resolveContinuity({
      shots,
      characters,
      products,
      locations
    });

    const now = new Date().toISOString();

    // 8. Construct new AdSpec draft
    const newSpec: AdSpec = {
      ...currentSpec,
      identity: {
        ...currentSpec.identity,
        creativeState: 'director_plan_draft',
        updatedAt: now
      },
      characters,
      products,
      locations,
      story: storyModel,
      shots,
      continuity: {
        links: continuityReport.links
      },
      decisionMetadata: {
        ...currentSpec.decisionMetadata,
        'story.logline': {
          source: 'ai_proposed',
          confidence: 0.95,
          status: 'confirmed',
          locked: false,
          confirmedAt: now,
          confirmedBy: userId || 'director_service'
        }
      }
    };

    // 9. Deterministic Multi-Stage Validation
    const validation = videoAdValidationService.validateAdSpec(newSpec, currentSpec);
    if (!validation.valid) {
      const firstErr = validation.errors[0];
      throw new Error(`Director Plan validation failed: [${firstErr.code}] ${firstErr.message}`);
    }

    // 10. Advance AdSpec to Version N+1 with normalized relational persistence
    const versionResult = await videoAdProjectRepository.createVersion(
      projectId,
      workspaceId,
      newSpec,
      `Director's Plan generated for concept: ${selectedConcept.name}`,
      userId
    );

    return {
      success: true,
      projectId,
      adSpecVersionNumber: versionResult.versionNumber,
      storyModel,
      shots,
      continuityReport,
      adSpec: versionResult.adSpec
    };
  }

  /**
   * Retrieves the current Director's Plan and continuity status for a project.
   */
  public async getDirectorsPlan(projectId: string, workspaceId: string): Promise<GetDirectorsPlanResponse> {
    const project = await videoAdProjectRepository.getProject(projectId, workspaceId);
    if (!project) {
      throw new Error(`Project '${projectId}' not found in workspace '${workspaceId}'.`);
    }

    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found.`);
    }

    const continuityReport = continuityResolverService.resolveContinuity({
      shots: currentSpec.shots || [],
      characters: currentSpec.characters || [],
      products: currentSpec.products || [],
      locations: currentSpec.locations || []
    });

    const isConfirmed = currentSpec.identity.creativeState === 'approved' || currentSpec.identity.creativeState === 'execution_snapshot';

    return {
      projectId,
      adSpecVersionNumber: currentSpec.identity.specVersion,
      adSpec: currentSpec,
      storyModel: (currentSpec.story as StoryModel) || { structureType: 'minimal_hero', logline: '', beats: [] },
      shots: currentSpec.shots || [],
      continuityReport,
      isConfirmed
    };
  }

  /**
   * User reviews and confirms the Director's Plan.
   * Locks plan decisions in video_ad_decisions and transitions creativeState to 'approved'.
   */
  public async confirmDirectorsPlan(params: {
    projectId: string;
    workspaceId: string;
    userNotes?: string;
    userId?: string;
  }): Promise<ConfirmDirectorsPlanResponse> {
    const { projectId, workspaceId, userNotes, userId } = params;

    const currentSpec = await videoAdProjectRepository.getCurrentAdSpec(projectId, workspaceId);
    if (!currentSpec) {
      throw new Error(`AdSpec for project '${projectId}' not found.`);
    }

    if (!currentSpec.shots || currentSpec.shots.length === 0 || currentSpec.identity.creativeState === 'discovery') {
      throw new Error('CANNOT_CONFIRM_EMPTY_PLAN: Director\'s Plan contains no shots or creativeState is discovery.');
    }

    const now = new Date().toISOString();

    // Lock plan decisions
    const approvedSpec: AdSpec = {
      ...currentSpec,
      identity: {
        ...currentSpec.identity,
        creativeState: 'approved',
        updatedAt: now
      },
      decisionMetadata: {
        ...currentSpec.decisionMetadata,
        'story.approved': {
          source: 'user_selected',
          confidence: 1.0,
          status: 'confirmed',
          locked: true,
          confirmedAt: now,
          confirmedBy: userId || 'user',
          reason: userNotes || 'User approved story beats and narrative architecture'
        },
        'shots.approved': {
          source: 'user_selected',
          confidence: 1.0,
          status: 'confirmed',
          locked: true,
          confirmedAt: now,
          confirmedBy: userId || 'user',
          reason: userNotes || 'User approved shot plan, timing, and cinematography'
        },
        'continuity.approved': {
          source: 'user_selected',
          confidence: 1.0,
          status: 'confirmed',
          locked: true,
          confirmedAt: now,
          confirmedBy: userId || 'user',
          reason: 'Continuity graph verified and approved'
        }
      }
    };

    const versionResult = await videoAdProjectRepository.createVersion(
      projectId,
      workspaceId,
      approvedSpec,
      userNotes || 'Director\'s Plan confirmed by user',
      userId
    );

    return {
      success: true,
      projectId,
      adSpecVersionNumber: versionResult.versionNumber,
      versionNumber: versionResult.versionNumber,
      creativeState: 'approved',
      adSpec: versionResult.adSpec,
      status: 'approved',
      approvedAt: now
    };
  }

  /**
   * Helper: Ensure character bible has stable entities (char_*).
   */
  private ensureCharacters(spec: AdSpec, concept: CreativeConcept): AdCharacterEntity[] {
    if (spec.characters && spec.characters.length > 0) {
      return spec.characters;
    }

    return [
      {
        id: 'char_protagonist',
        displayName: 'Lead Protagonist',
        narrativeRole: 'protagonist',
        referenceAssetIds: [],
        appearance: {
          gender: 'neutral',
          apparentAge: '24-32',
          distinguishingFeatures: ['focused and energetic posture']
        },
        wardrobe: {
          outfit: 'Athletic minimalist lifestyle attire',
          colors: ['#0F172A', '#38BDF8'],
          accessories: []
        },
        behaviorPersonality: 'Determined, modern, dynamic',
        continuityConstraints: ['Consistent athletic attire across shots', 'Facial geometry invariant'],
        forbiddenChanges: ['Sudden hair color changes', 'Unexplained wardrobe shifts'],
        locks: ['identity', 'wardrobe']
      }
    ];
  }

  /**
   * Helper: Ensure product bible has stable entities (product_*).
   */
  private ensureProducts(spec: AdSpec, concept: CreativeConcept): AdProductEntity[] {
    if (spec.products && spec.products.length > 0) {
      return spec.products;
    }

    const prodName = typeof spec.brief.product === 'string' && spec.brief.product
      ? spec.brief.product
      : 'Apex Product';

    return [
      {
        id: 'product_hero',
        name: prodName,
        referenceAssetIds: [],
        visualDescription: `Official commercial packaging of ${prodName}`,
        shapeForm: 'Ergonomic cylindrical packaging',
        materials: ['brushed aluminum', 'matte finish'],
        colorPalette: ['#0A0A0A', '#38BDF8'],
        packaging: {
          containerType: 'can',
          materials: ['aluminum'],
          finish: 'matte'
        },
        branding: {
          logoPlacement: 'Upper third centered',
          labelDetails: 'Crisp typography and brand logotype'
        },
        labelLogoConstraints: ['Logo must remain unobstructed in hero frames'],
        orientationConstraints: ['Upright vertical orientation'],
        allowedTransformations: ['Rotational spin', 'Hero push-in'],
        forbiddenTransformations: ['Warped geometry', 'Inverted brand typography'],
        continuityRequirements: ['Packaging condition consistent across sequence'],
        locks: ['geometry', 'packaging', 'logo']
      }
    ];
  }

  /**
   * Helper: Ensure location bible has stable entities (loc_*).
   */
  private ensureLocations(spec: AdSpec, concept: CreativeConcept): AdSpecLocationEntity[] {
    if (spec.locations && spec.locations.length > 0) {
      return spec.locations;
    }

    return [
      {
        id: 'loc_default',
        name: 'Modern Commercial Studio & Dynamic City Space',
        description: 'High-contrast architectural setting transitioning into vibrant atmospheric light',
        referenceAssetIds: [],
        architecture: 'Minimalist contemporary architectural space',
        spatialCharacteristics: {
          indoor: true,
          dimensions: 'spacious',
          depthOfSpace: 'deep layered background with controlled falloff'
        },
        lightingCharacteristics: {
          timeOfDay: 'studio',
          mood: 'Clean, high-energy cinematic commercial'
        },
        palette: ['#0A0A0A', '#1E293B', '#38BDF8', '#FFFFFF'],
        atmosphere: 'Pristine, focused, dynamic',
        continuityConstraints: ['Consistent lighting temperature (5600K) across shots'],
        locks: ['architecture', 'lighting']
      }
    ];
  }
}

export const directorsPlanService = new DirectorsPlanService();
