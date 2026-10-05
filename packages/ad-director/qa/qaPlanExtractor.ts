/**
 * QA Plan Extractor.
 * Converts an approved frozen AdShot and parent AdSpec into structured, explicit target requirements.
 * Enforces the core invariant: ONLY evaluate dimensions specified in the plan;
 * do NOT penalize shots for unspecified attributes.
 *
 * Framework-free: MUST NOT import React, Express, or vendor SDKs.
 */

import type { AdSpec, AdShot } from '../../types/adSpec.js';
import type {
  ShotPlanRequirements,
  PlanRequirementItem,
  QACheckCategory
} from '../../contracts/videoQaContracts.js';

export class QAPlanExtractor {
  /**
   * Extracts explicit QA requirements from a shot in an execution snapshot.
   */
  extractRequirements(
    snapshotId: string,
    shot: AdShot,
    adSpec: AdSpec,
    priorShotContext?: {
      priorShotId?: string;
      priorShotAcceptedUrl?: string;
      inheritedStates?: Array<{ entityId: string; aspect: string; description: string }>;
    }
  ): ShotPlanRequirements {
    const items: PlanRequirementItem[] = [];
    const shotId = shot.shotId;

    // 1. Technical / Timing Requirements
    const targetDuration = shot.timing?.duration ?? shot.durationSeconds ?? 5;
    items.push({
      id: `${shotId}_tech_duration`,
      category: 'timing',
      dimension: 'durationSeconds',
      requirement: `Target duration is ${targetDuration} seconds (acceptable variance ±0.5s).`,
      sourcePath: 'timing.duration',
      isMandatory: true,
      expectedValue: targetDuration
    });

    const targetAspectRatio =
      (shot as any).aspectRatio ||
      adSpec.generationRequirements?.aspectRatio ||
      adSpec.brief?.aspectRatio ||
      '16:9';
    items.push({
      id: `${shotId}_tech_aspect_ratio`,
      category: 'technical',
      dimension: 'aspectRatio',
      requirement: `Video aspect ratio must match "${targetAspectRatio}".`,
      sourcePath: 'brief.aspectRatio',
      isMandatory: true,
      expectedValue: targetAspectRatio
    });

    // 2. Camera Requirements
    if (shot.camera) {
      if (shot.camera.framing || (shot.camera as any).shotFraming) {
        const framing = shot.camera.framing || (shot.camera as any).shotFraming;
        items.push({
          id: `${shotId}_cam_framing`,
          category: 'camera',
          dimension: 'cameraFraming',
          requirement: `Camera framing should be "${framing.replace(/_/g, ' ')}".`,
          sourcePath: 'camera.framing',
          isMandatory: true,
          expectedValue: framing
        });
      }

      if (shot.camera.cameraMovement || (shot.camera as any).movement) {
        const movement = shot.camera.cameraMovement || (shot.camera as any).movement;
        items.push({
          id: `${shotId}_cam_movement`,
          category: 'camera',
          dimension: 'cameraMovement',
          requirement: `Camera movement must execute "${movement.replace(/_/g, ' ')}".`,
          sourcePath: 'camera.cameraMovement',
          isMandatory: true,
          expectedValue: movement
        });
      }

      const angle = (shot.camera as any).cameraAngle || (shot.camera as any).angle;
      if (angle) {
        items.push({
          id: `${shotId}_cam_angle`,
          category: 'camera',
          dimension: 'cameraAngle',
          requirement: `Camera angle should be "${String(angle).replace(/_/g, ' ')}".`,
          sourcePath: 'camera.cameraAngle',
          isMandatory: false,
          expectedValue: angle
        });
      }

      if (shot.camera.composition || (shot.camera as any).depthOfField) {
        const comp = shot.camera.composition || (shot.camera as any).depthOfField;
        items.push({
          id: `${shotId}_cam_composition`,
          category: 'composition',
          dimension: 'composition',
          requirement: `Depth of field / composition: "${comp}".`,
          sourcePath: 'camera.composition',
          isMandatory: false,
          expectedValue: comp
        });
      }
    }

    // 3. Action & Choreography Requirements
    if (shot.action) {
      const desc = (shot.action as any).visualDescription || (shot.action as any).action;
      if (desc) {
        items.push({
          id: `${shotId}_action_core`,
          category: 'action',
          dimension: 'coreAction',
          requirement: `Core shot action: "${desc}".`,
          sourcePath: 'action.visualDescription',
          isMandatory: true,
          expectedValue: desc
        });
      }

      const choreographyBeats = Array.isArray((shot.action as any).choreography)
        ? (shot.action as any).choreography
        : (shot.action.beats || ((shot.action as any).choreography ? [{ action: (shot.action as any).choreography, relativeStart: 0, relativeEnd: shot.timing?.duration || 3 }] : []));
      if (choreographyBeats.length > 0) {
        const beatsDesc = choreographyBeats
          .map((b: any, i: number) => `Beat ${i + 1} (${b.relativeStart ?? 0}s-${b.relativeEnd ?? 0}s): ${b.action || b.description || b}`)
          .join(' -> ');
        items.push({
          id: `${shotId}_action_temporal_beats`,
          category: 'action',
          dimension: 'temporalSequence',
          requirement: `Temporal choreography sequence: ${beatsDesc}`,
          sourcePath: 'action.choreography',
          isMandatory: true,
          expectedValue: beatsDesc
        });
      }
    }

    // 4. Character & Wardrobe Requirements
    const featuredCharIds = (shot.action as any)?.featuredCharacters || [];
    const charactersList = (adSpec.characters as any)?.characters || (adSpec.characters as any) || [];
    if (Array.isArray(charactersList)) {
      for (const charId of featuredCharIds) {
        const char = charactersList.find((c: any) => c.characterId === charId || c.id === charId);
        if (char) {
          items.push({
            id: `${shotId}_char_${charId}_identity`,
            category: 'character',
            dimension: `character_${charId}`,
            requirement: `Featured character "${char.name || char.displayName}": ${char.physicalAppearance?.face || char.appearance?.gender || ''}, ${char.physicalAppearance?.bodyType || char.appearance?.physique || ''}.`,
            sourcePath: `characters.${charId}`,
            isMandatory: true,
            expectedValue: char.name || char.displayName
          });

          const wardrobe = char.wardrobe?.defaultOutfit || char.wardrobe?.style || char.wardrobe?.outfit;
          if (wardrobe) {
            items.push({
              id: `${shotId}_char_${charId}_wardrobe`,
              category: 'wardrobe',
              dimension: `wardrobe_${charId}`,
              requirement: `Character "${char.name || char.displayName}" wardrobe: "${wardrobe}".`,
              sourcePath: `characters.${charId}.wardrobe`,
              isMandatory: true,
              expectedValue: wardrobe
            });
          }
        }
      }
    }

    // 5. Product Appearance & Visibility Requirements
    const featuredProductIds = (shot.action as any)?.featuredProducts || [];
    const productsList = (adSpec.products as any)?.products || (adSpec.products as any) || [];
    if (Array.isArray(productsList)) {
      for (const prodId of featuredProductIds) {
        const prod = productsList.find((p: any) => p.productId === prodId || p.id === prodId);
        if (prod) {
          items.push({
            id: `${shotId}_prod_${prodId}_appearance`,
            category: 'product',
            dimension: `product_${prodId}`,
            requirement: `Featured product "${prod.name}": Form factor "${prod.formFactor || ''}", Brand markings: "${prod.packaging?.labelDetails || prod.keyFeatures?.join(', ') || ''}".`,
            sourcePath: `products.${prodId}`,
            isMandatory: true,
            expectedValue: prod.name
          });
        }
      }
    }

    // 6. Environment & Lighting Requirements
    if (shot.environment?.locationId || (shot.action as any)?.locationRef) {
      const locId = shot.environment?.locationId || (shot.action as any)?.locationRef;
      const locationsList = (adSpec.locations as any)?.locations || (adSpec.locations as any) || [];
      const loc = Array.isArray(locationsList) ? locationsList.find((l: any) => l.locationId === locId || l.id === locId) : null;
      const locName = loc?.name || locId;
      items.push({
        id: `${shotId}_env_location`,
        category: 'environment',
        dimension: 'location',
        requirement: `Environment location: "${locName}". ${loc?.visualCharacteristics?.architectureStyle || ''}`,
        sourcePath: 'environment.locationId',
        isMandatory: true,
        expectedValue: locName
      });
    }

    if (shot.lighting) {
      const mood = (shot.lighting as any).mood || (shot.lighting as any).atmosphere || (shot.lighting as any).lightingStyle || shot.lighting.source;
      if (mood) {
        items.push({
          id: `${shotId}_light_mood`,
          category: 'lighting',
          dimension: 'lightingMood',
          requirement: `Lighting mood: "${mood}".`,
          sourcePath: 'lighting.mood',
          isMandatory: false,
          expectedValue: mood
        });
      }
    }

    // 7. Continuity Requirements
    if (shot.continuity) {
      const inherited = shot.continuity.inheritedStates || [];
      if (inherited.length > 0) {
        const rules = inherited.map(s => `${s.entityId} [${s.aspect}]: ${s.requirement || (s as any).description || (s as any).stateDescription || ''}`).join('; ');
        items.push({
          id: `${shotId}_continuity_inherited`,
          category: 'continuity',
          dimension: 'inheritedStates',
          requirement: `Continuity must preserve prior state: ${rules}`,
          sourcePath: 'continuity.inheritedStates',
          isMandatory: true,
          expectedValue: rules
        });
      }
    }

    if (priorShotContext?.inheritedStates && priorShotContext.inheritedStates.length > 0) {
      const priorRules = priorShotContext.inheritedStates.map(s => `${s.entityId} preserves ${s.aspect}`).join('; ');
      items.push({
        id: `${shotId}_continuity_prior_context`,
        category: 'continuity',
        dimension: 'priorShotContext',
        requirement: `Neighboring shot continuity: ${priorRules}`,
        sourcePath: 'continuity.priorShot',
        isMandatory: true,
        expectedValue: priorRules
      });
    }

    // 8. Brand & Constraints Requirements
    const mustInclude = adSpec.brief?.mustInclude || [];
    if (mustInclude.length > 0) {
      items.push({
        id: `${shotId}_brand_must_include`,
        category: 'brand',
        dimension: 'mustInclude',
        requirement: `Brand requirements to include: "${mustInclude.join(', ')}".`,
        sourcePath: 'brief.mustInclude',
        isMandatory: true,
        expectedValue: mustInclude
      });
    }

    const mustAvoid = (adSpec.brief as any)?.avoid || (adSpec.brief as any)?.mustAvoid || [];
    if (mustAvoid.length > 0) {
      items.push({
        id: `${shotId}_brand_must_avoid`,
        category: 'brand',
        dimension: 'mustAvoid',
        requirement: `Brand elements to avoid: "${mustAvoid.join(', ')}".`,
        sourcePath: 'brief.avoid',
        isMandatory: true,
        expectedValue: mustAvoid
      });
    }

    // 9. Audio Requirements (Foundation)
    if (shot.audio) {
      if (shot.audio.voiceover || (shot.audio as any).dialogue) {
        const vo = shot.audio.voiceover || (shot.audio as any).dialogue;
        items.push({
          id: `${shotId}_audio_voiceover`,
          category: 'audio',
          dimension: 'voiceoverExpected',
          requirement: `Audio requirement includes voiceover / dialogue intent: "${vo}".`,
          sourcePath: 'audio.voiceover',
          isMandatory: false,
          expectedValue: vo
        });
      }
    }

    return {
      snapshotId,
      shotId,
      sequence: shot.sequence,
      durationSeconds: targetDuration,
      aspectRatio: targetAspectRatio,
      requirements: items,
      continuityContext: priorShotContext
    };
  }
}

export const qaPlanExtractor = new QAPlanExtractor();
